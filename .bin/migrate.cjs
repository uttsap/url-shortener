#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const shell = require('shelljs');
const dotenv = require('dotenv');
const process = require('process');

shell.config.fatal = true;
dotenv.config();

// Read config file path from command line argument
const configFileArg = process.argv[2];
if (!configFileArg) {
  console.error('Usage: node migrate.cjs <path-to-config.json>');
  process.exit(1);
}

// Resolve the config path
const configPath = path.resolve(process.cwd(), configFileArg);
if (!fs.existsSync(configPath)) {
  console.error(`ERROR: migration config not found at ${configPath}`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Extract schema and folder
if (!config.schemas || config.schemas.length === 0) {
  console.error('ERROR: No schema defined in migration config.');
  process.exit(1);
}

const { schema, folder } = config.schemas[0];
if (!schema || !folder) {
  console.error('ERROR: schema or folder missing in config.');
  process.exit(1);
}

// Resolve migrations folder path
const migrationsDir = path.resolve(process.cwd(), folder);
if (!fs.existsSync(migrationsDir)) {
  console.error(`ERROR: migrations folder not found: ${migrationsDir}`);
  process.exit(1);
}

// Required environment variables
const requiredEnv = [
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
  'POSTGRES_HOST'
];

for (const name of requiredEnv) {
  if (!process.env[name]) {
    console.error(`ERROR: missing ${name} environment variable`);
    process.exit(1);
  }
}

// Create temporary .pgpass file
const dir = path.join(shell.tempdir().toString(), Math.random().toString(36).substring(2, 18));
const passfile = path.join(dir, '.pgpass');
shell.mkdir('-p', dir);
process.on('exit', () => shell.rm('-rf', dir));

shell
  .ShellString(
`${process.env.POSTGRES_HOST}:5432:postgres:${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}
${process.env.POSTGRES_HOST}:5432:${process.env.POSTGRES_DB}:${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}`
  )
  .to(passfile);
shell.chmod('600', passfile);

// Ensure schema exists
shell.exec(
  `psql --no-psqlrc -h ${process.env.POSTGRES_HOST} -U ${process.env.POSTGRES_USER} -d ${process.env.POSTGRES_DB} -c "CREATE SCHEMA IF NOT EXISTS ${schema};"`,
  { env: { ...process.env, PGPASSFILE: passfile } }
);

// Ensure _updates table exists
shell.exec(
  `psql --no-psqlrc -h ${process.env.POSTGRES_HOST} -U ${process.env.POSTGRES_USER} -d ${process.env.POSTGRES_DB} -c "
    CREATE TABLE IF NOT EXISTS ${schema}._updates (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    );
  "`,
  { env: { ...process.env, PGPASSFILE: passfile } }
);

// Run migrations
const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  console.log('No SQL migration files found.');
  process.exit(0);
}

for (const file of files) {
  const fullPath = path.join(migrationsDir, file);

  const check = shell.exec(
    `psql --no-psqlrc -h ${process.env.POSTGRES_HOST} -U ${process.env.POSTGRES_USER} -d ${process.env.POSTGRES_DB} -t -c "SELECT 1 FROM ${schema}._updates WHERE filename='${file}' LIMIT 1;"`,
    { env: { ...process.env, PGPASSFILE: passfile }, silent: true }
  );

  if (check.stdout.trim() === '1') {
    console.log(`Skipping already applied migration: ${file}`);
    continue;
  }

  console.log(`Running migration: ${file}`);
  const res = shell.exec(
    `psql --no-psqlrc -h ${process.env.POSTGRES_HOST} -U ${process.env.POSTGRES_USER} -d ${process.env.POSTGRES_DB} -v schema=${schema} -f "${fullPath}"`,
    { env: { ...process.env, PGPASSFILE: passfile } }
  );

  if (res.code !== 0) {
    console.error(`Migration FAILED: ${file}`);
    process.exit(1);
  }

  shell.exec(
    `psql --no-psqlrc -h ${process.env.POSTGRES_HOST} -U ${process.env.POSTGRES_USER} -d ${process.env.POSTGRES_DB} -c "INSERT INTO ${schema}._updates (filename) VALUES ('${file}') ON CONFLICT DO NOTHING;"`,
    { env: { ...process.env, PGPASSFILE: passfile } }
  );

  console.log(`Migration SUCCESS: ${file}`);
}

console.log('All migrations completed successfully.');

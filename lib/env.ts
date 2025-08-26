import { config } from 'dotenv';

config();

export type EnvironmentStage = 'dev' | 'test' | 'stage' | 'production';

export function getCurrentStage() {
  return (process.env.STAGE as EnvironmentStage) || 'dev';
}

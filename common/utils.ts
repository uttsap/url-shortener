import { PostgresConfigKeys } from "./config/contracts";

function createSchema<T extends string>(...keys: T[]) {
    return keys;
}

export const databaseConfigFields = createSchema<PostgresConfigKeys>(
    "host",
    "user",
    "password",
    "database",
    "readOnlyHost",
    "ssl"
);

export const hasRequiredProperties = <T extends object>(
    obj: T,
    requiredFields: (keyof T)[]
  ): boolean => {
    return requiredFields.every(
      field => obj[field] !== undefined && obj[field] !== null
    );
  };
  

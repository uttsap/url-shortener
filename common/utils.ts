import { PostgresConfigKeys } from "./config/contracts";

function createSchema<T extends string>(...keys: T[]) {
    return keys;
}

export const databaseConfigFields = createSchema<string>(
    "host",
    "user",
    "password",
    "database",
    "readOnlyHost",
    "ssl"
);

export const hasRequiredProperties = <T extends object>(
    obj: T,
    requiredFields: string[]
  ): boolean => {
    return requiredFields.every(
      field => obj[field as keyof T] !== undefined && obj[field as keyof T] !== null
    );
  };
  

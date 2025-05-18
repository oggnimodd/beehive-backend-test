import dotenv from "dotenv";

dotenv.config();

const getConfigValue = (key: string, defaultValue?: string) => {
  const value = process.env[key];

  // Check if the value is defined
  if (value !== undefined) {
    return value;
  }

  // Use default value if it's defined
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  throw new Error(`FATAL ERROR: Environment variable ${key} is not set.`);
};

export const config = {
  port: parseInt(getConfigValue("PORT", "3000"), 10),
  nodeEnv: getConfigValue("NODE_ENV", "development"),

  databaseUrl: getConfigValue("DATABASE_URL"),

  jwt: {
    secret: getConfigValue("JWT_SECRET"),
    expiresIn: getConfigValue("JWT_EXPIRES_IN", "1d"),
  },

  bcryptSaltRounds: parseInt(getConfigValue("BCRYPT_SALT_ROUNDS", "10"), 10),
} as const;

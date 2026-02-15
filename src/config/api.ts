import * as dotenv from "dotenv";

dotenv.config();

export const {
    EXPRESS_ENV = 'development',
    LOG_LEVEL,
    JWT_SECRET,
    ACCEPTED_URLS = "[]",
    AUTH_TOKEN_NAME = "AUTH_TOKEN",
    PORT = 4000,
    PROXY_LEVELS = EXPRESS_ENV === "production" ? 1 : 0
} = process.env;
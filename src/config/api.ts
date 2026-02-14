import * as dotenv from "dotenv";

dotenv.config()

export const {
    NODE_ENV = "development",
    // SUPERVISOR_EMAIL,
    // LINK_LOGO,
    LOG_LEVEL,
    // MAIL_USER,
    // MAIL_PASS,
    // JWT_SECRET,
    // ACCEPTED_URLS = "[]",
    // AUTH_TOKEN_NAME = "AUTH_TOKEN",
    PORT = 4000,
    PROXY_LEVELS = NODE_ENV === "production" ? 1 : 0
} = process.env;
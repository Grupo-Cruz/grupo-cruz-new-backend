import * as dotenv from "dotenv";

dotenv.config();

export const {
    SALT_ROUNDS = "10"
} = process.env;
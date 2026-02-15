import bcrypt from "bcrypt";
import { SALT_ROUNDS } from "../config/encrypt";

export async function encryptPassword(password: string) {
    const salt = await bcrypt.genSalt(parseInt(SALT_ROUNDS));
    return bcrypt.hash(password, salt);
}

export async function comparePasswords(password: string, hashedPassword: string) {
    return bcrypt.compare(password, hashedPassword);
}
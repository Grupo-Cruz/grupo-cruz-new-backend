import { StringValue } from "ms";
import { JWT_SECRET } from "../config/api";
import jwt from 'jsonwebtoken';

export const generateToken = (payload: object, expiresIn: StringValue = '1d') => {
    return jwt.sign(payload, JWT_SECRET!, { expiresIn });
};

export const verifyToken = (token: string) => {
    return jwt.verify(token, JWT_SECRET!);
};
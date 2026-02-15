import { StringValue } from "ms";
import { JWT_SECRET } from "../config/api";
import jwt from 'jsonwebtoken';

export const generateToken = (payload: object, expiresIn: StringValue = '1d') => {
    try {
        return jwt.sign(payload, JWT_SECRET!, { expiresIn });
    } catch (error) {
        console.log(`Error al generar el jwt: ${error}`);
    }
};

export const verifyToken = (token: string) => {
    try {
        return jwt.verify(token, JWT_SECRET!);
    } catch (error) {
        console.log(`Error al verificar el jwt: ${error}`);
    }
};
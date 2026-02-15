import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { AUTH_TOKEN_NAME as AUTH_TOKEN } from "../config/api";
import { Repository, User, Permissions, Cache } from "../index.d";

export default class JWTMiddlewares {
    private repository: Repository<User>;
    private cache: Cache;
    private BASE_KEY = "authenticated";

    /**
     * @param {Repository<User>} repository 
     * @param {Cache} cache 
     */
    constructor (repository: Repository<User>, cache: Cache) {
        this.cache = cache;
        this.repository = repository;
    }

    /**
     * Función que obtiene los datos del usuario a través del JSONWebToken, si ya se había parseado anteriormente pasa directamente al siguiente middleware, si no se pasa ningún token, "user" será igual a "undefined"
     */
    getUserData = async (req: Request, res: Response, next: NextFunction) => {
        const token = req.cookies[AUTH_TOKEN] as string | undefined;
        req.session = { user: undefined };

        if (token) {
            try {
                const payload = verifyToken(token) as { id: string, permissions: Permissions };
                const cacheKey = `${this.BASE_KEY}:id=${payload.id}`;
                const cached = await this.cache.get<{ id: string, permissions: Permissions }>(cacheKey);

                if (!cached) {
                    const result = await this.repository.getById(payload.id);

                    if (!result.success || result.data?.permissions !== payload.permissions) {
                        res.status(401).json({ message: "Usuario no válido" });
                        return;
                    }

                    this.cache.set({ key: cacheKey, value: payload, time: 600, onExpire: (value) => console.log(`Valor expirado: ${value}`) });
                }

                req.session.user = { ...payload };
            } catch (error) {
                console.log(`Error: ${error}`);
                res.status(401).json({ message: "Token inválido o expirado" });
                return;
            }
        }

        next();
    }
}

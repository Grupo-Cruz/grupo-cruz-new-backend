import { Auth } from "node_modules/firebase-admin/lib/auth/auth";
import { Request, Response } from "express";
import { generateToken } from "../utils/jwt";
import { Repository, User, Controller } from "../index.d";
import { AUTH_TOKEN_NAME as AUTH_TOKEN, EXPRESS_ENV } from "../config/api";
import { logger } from "../utils/logger";
import * as dotenv from "dotenv";

dotenv.config();

export default class AuthController {
    private auth: Auth;
    private repository: Repository<User>;
    private controller: Controller<User>;

    constructor (auth: Auth, repository: Repository<User>, controller: Controller<User>) {
        this.controller = controller;
        this.auth = auth;
        this.repository = repository;
    }

    logIn = async (req: Request, res: Response) => {
        const { idToken } = req.body;

        if (!idToken) {
            logger.warn("🔐 Login rechazado: falta token");
            res.status(400).json({ message: "Token faltante" });
            return;
        }

        try {
            const decoded = await this.auth.verifyIdToken(idToken);
            logger.info("🔐 Login con token válido", { uid: decoded.uid });

            const { uid: id, email } = decoded;
            const userRes = await this.repository.getById(id);

            if (!userRes.success || !userRes.data) {
                logger.warn("🔐 Login rechazado: no se encontró ninguna coincidencia");
                res.status(404).json({ message: "Credenciales incorrectas" });
                return;
            }

            const user = userRes.data;

            if (user.email !== email) {
                logger.warn("🔐 Login rechazado: los correos ingresados no coinciden");
                res.status(404).json({ message: "Credenciales incorrectas" });
                return;
            }

            const token = generateToken({ id, permissions: user.permissions }, "7d");

            res.cookie(AUTH_TOKEN, token, { 
                httpOnly: true, 
                sameSite: EXPRESS_ENV === "production" ? "none" : undefined, 
                secure: EXPRESS_ENV === "production", 
                path: "/",
                maxAge: 1000 * 60 * 60 * 24 * 7
            });
            res.status(200).json({ message: "Login ok", originalData: user });
        } catch (error) {
            logger.error(`🔴 Error al verificar ID token`, { error });
            res.status(401).json({ message: "Token inválido", error });
        }
    }

    register = async (req: Request<unknown, any, User & { password: string } | User>, res: Response) => {
        const originalData = req.body as User & { password: string };

        try {
            const userRecord = await this.auth.createUser({
                email: originalData.email,
                password: originalData.password,
                displayName: originalData.name
            });

            const { password, ...data } = originalData;
            data.id = userRecord.uid;
            req.body = data;

            this.controller.create(req as Request, res);
        } catch (error) {
            logger.error(`🔴 Error al crear token`, { error });
            res.status(500).json({ message: "Ocurrió un error inesperado al registrar usuario, lamentamos las molestias", error });
        }
    }

    logOut = async (_req: Request, res: Response) => {
        res.clearCookie(AUTH_TOKEN);
        res.status(200).json({ message: "Sesión cerrada con éxito" });
    }

    me = (req: Request, res: Response) => {
        const user = req.session?.user;

        if (!user) {
            logger.warn("No se pudo identificar al usuario mediante la cookie");
            res.status(401).json({ message: "Usuario no identificado" });
        } else {
            res.status(200).json({ originalData: user, message: "Usuario identificado correctamente" })
        }
    }
}
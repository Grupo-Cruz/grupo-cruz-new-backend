import { Request, Response } from "express";
import { Repository, User, Controller } from "../index.d";
import { logger } from "../utils/logger";
import * as dotenv from "dotenv";
import { comparePasswords } from "../utils/encrypt";

dotenv.config();

export default class AuthController {
    private repository: Repository<User>;
    private controller: Controller<User>;

    constructor (repository: Repository<User>, controller: Controller<User>) {
        this.controller = controller;
        this.repository = repository;
    }

    logIn = async (req: Request, res: Response) => {
        const { email, password } = req.body;
        const userRes = await this.repository.getByField({ fieldName: "email", fieldFinder: email, limit: 1 });

        if (!userRes.success || !userRes.data) {
            logger.warn("🔐 Login rechazado: no se encontró ninguna coincidencia");
            res.status(404).json({ message: "Credenciales incorrectas" });
            return;
        }

        const user = userRes.data[0];

        if (!comparePasswords(password, user.password)) {
            logger.warn("🔐 Login rechazado: la contraseña no coincide");
            res.status(404).json({ message: "Credenciales incorrectas" });
            return;
        }
        res.status(200).json({ message: "Login ok", originalData: user });
    }

    register = async (req: Request<unknown, any, User & { password: string } | User>, res: Response) => {
        this.controller.create(req as Request, res);
    }
}
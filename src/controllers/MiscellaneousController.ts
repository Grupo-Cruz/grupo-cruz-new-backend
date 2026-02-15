import { Request, Response } from "express";
import { sendCommentEmail, sendSuspiciousActivityEmail } from "../utils/mailer";

export default class MiscellaneousRouter {
    sendCommentEmail = async (req: Request, res: Response) => {
        const data = req.body;

        try {
            await sendCommentEmail(data);
            res.status(200).json({ message: "Correo enviado exitosamente" });
        } catch (error) {
            console.error(error);
            res.status(500).send({ message: "Ocurrió un error inesperado al mandar el correo, lamentamos los inconvenientes" });
        }
    }

    sendSuspiciousActivityLoginEmail = async (req: Request, res: Response) => {
        const data = req.body;

        try {
            await sendSuspiciousActivityEmail(data.email, { ip: req.ip, userAgent: req.headers["user-agent"] });
            res.status(200).json({ message: "Correo enviado exitosamente" });
        } catch (error) {
            console.error(error);
            res.status(500).send({ message: "Ocurrió un error inesperado al mandar el correo, lamentamos los inconvenientes" });
        }
    }
}
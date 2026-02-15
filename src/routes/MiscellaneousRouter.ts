import { Router } from "express";
import { validateCommentEmail } from "../schemas/MiscellaneousSchema";
import MiC from "../controllers/MiscellaneousController";

const MiscellaneousController = new MiC();

export const router = Router();

router.post(
    "/send-comment-email",
    async (req, res, next) => {
        const result = await validateCommentEmail(req.body);

        if (!result.success) {
            res.status(400).json({ error: JSON.parse(result.error.message) });
            return;
        }

        req.body = result.data;
        next();
    },
    MiscellaneousController.sendCommentEmail
);

router.post(
    "/send-suspicious-login-email", 
    MiscellaneousController.sendSuspiciousActivityLoginEmail
);
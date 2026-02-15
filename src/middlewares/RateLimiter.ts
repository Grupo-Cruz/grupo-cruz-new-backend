import { Firestore } from "firebase-admin/firestore";
import rateLimit from "express-rate-limit";

export default class Limiters {
    static defaultLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        statusCode: 429,
        message: "Demasiadas peticiones. Por favor, inténtalo más tarde.",
        standardHeaders: true,
        legacyHeaders: false
    });

    static loginLimiter = (db: Firestore) => rateLimit({
        windowMs: 60 * 60 * 1000,
        max: 3,
        standardHeaders: true,
        legacyHeaders: false,
        handler: async (req, res) => {
            const email = req.body?.email;
            const ip = req.ip;
            const userAgent = req.headers['user-agent'];
            const timestamp = new Date().toISOString();

            if (!req.session) req.session = {};

            if (email && !req.session?.suspiciousEmailSent) {
                try {
                    await db.collection("suspicious_activity_logs").add({
                        email,
                        ip,
                        userAgent,
                        timestamp,
                        type: "register_rate_limit"
                    });
                } catch (error) {
                    console.warn("⚠️ No se pudo guardar el log en Firestore:", error);
                }
            }

            res.status(429).json({ message: "Demasiadas solicitudes. Intenta nuevamente más tarde." });
        }
    });
}
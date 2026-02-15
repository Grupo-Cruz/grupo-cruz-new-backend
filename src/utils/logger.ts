import winston from "winston";
import path from "path";
import { EXPRESS_ENV, LOG_LEVEL } from "../config/api";

// Define ubicación de los logs
const logDir = path.join(__dirname, "..", "logs");

export const logger = winston.createLogger({
    level: LOG_LEVEL || "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({
            filename: `${logDir}/error.log`,
            level: "error"
        }),
        new winston.transports.File({
            filename: `${logDir}/combined.log`
        })
    ]
});

// Si estás en desarrollo, también muestra los logs en consola
if (EXPRESS_ENV !== "production") {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}
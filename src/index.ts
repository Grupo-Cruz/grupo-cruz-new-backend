import { router as UserRouter } from "./routes/UserRouter";
import { router as CountryRouter } from "./routes/CountryRouter"
import { router as AuthRouter } from "./routes/AuthRouter";
import { router as EmployeeRouter } from "./routes/EmployeeRouter";
import { router as ModuleRouter } from "./routes/ModuleRouter";
import { router as PayrollRouter } from "./routes/PayrollRouter";
import { ACCEPTED_URLS as A_U, EXPRESS_ENV, PORT } from "./config/api"; 
import { db } from "./config/firebase";
import { logger } from "./utils/logger";
import { PROXY_LEVELS } from "./config/api";
import express, { json, urlencoded } from "express";
import Cache from "./utils/Cache";
import UR from "./repositories/UserRepository";
import JWTM from "./middlewares/JWTMiddlewares";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import cookieParser from "cookie-parser";

const UserRepository = new UR(db, "users");
const JWTMiddlewares = new JWTM(UserRepository, new Cache());

const app = express();
const ACCEPTED_URLS: Array<string> = JSON.parse(A_U);

app.disable("x-powered-by");

logger.info("Entorno del node: ", { EXPRESS_ENV });

if (EXPRESS_ENV === "production") {
    app.set("trust proxy", typeof PROXY_LEVELS === "number" ? PROXY_LEVELS : Number(PROXY_LEVELS));
}

app.use(compression());
app.use(json());
app.use(cookieParser());
app.use(helmet());
app.use(cors({
    credentials: true,
    origin: ACCEPTED_URLS
}));
app.use(urlencoded({ extended: true }));
app.use(JWTMiddlewares.getUserData);

if (EXPRESS_ENV === "production") {
    app.use((req, _res, next) => {
        logger.info("Se recibió un petición de la siguiente ip: ", { ip: req.ip });
        logger.info("IPS detectadas durante el proceso: ", { ips: req.ips });
        logger.info("Cambios de ips por proxy: ", { ipsProxiadas: req.headers['x-forwarded-for'] });
        next();
    });
} else if (EXPRESS_ENV === "development") {
    app.use((req, _res, next) => {
        logger.info("Se recibió un petición de la siguiente ip: ", { ip: req.ip });
        next();
    })
}

app.get('/', (_req, res) => {
    logger.info("🔄 Ping recibido en la ruta raíz");
    res.send(`
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
        </style>
        <div style="font-family: sans-serif; text-align: center; min-width: 100vw; min-height: 100vh; display: flex; justify-content: center; align-items: center; background-color:rgb(240, 186, 77); flex-direction: column;">
            <h1 style="color: green; font-size: 48px;">✅ API is <span style="color: #007bff;">RUNNING</span></h1>
            <p style="font-size: 24px;">Everything looks good 🚀</p>
        </div>
    `);
});

app.use("/api/users", UserRouter);
app.use("/api/countries", CountryRouter);
app.use("/api/employees", EmployeeRouter);
app.use("/api/modules", ModuleRouter);
app.use("/api/payroll", PayrollRouter);
app.use("/api/auth", AuthRouter);

app.listen(PORT, () => {
    console.log(`
        ███████╗██████╗ ██╗███╗   ██╗██╗███████╗███████╗
        ██╔════╝██╔══██╗██║████╗  ██║██║██╔════╝██╔════╝
        █████╗  ██████╔╝██║██╔██╗ ██║██║█████╗  ███████╗
        ██╔══╝  ██╔═══╝ ██║██║╚██╗██║██║██╔══╝  ╚════██║
        ███████╗██║     ██║██║ ╚████║██║███████╗███████║
        ╚══════╝╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝╚══════╝╚══════╝
        API is running on port ${PORT} 🚀
    `);
});
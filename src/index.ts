import { router as UserRouter } from "./routes/UserRouter";
import { router as CountryRouter } from "./routes/CountryRouter"
import { router as AuthRouter } from "./routes/AuthRouter";
import { router as EmployeeRouter } from "./routes/EmployeeRouter";
import { router as ModuleRouter } from "./routes/ModuleRouter";
import { router as PayrollRouter } from "./routes/PayrollRouter";
import { PORT } from "./config/api"; 
import { logger } from "./utils/logger";
import express, { json, urlencoded } from "express";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";

const app = express();

app.disable("x-powered-by");

app.use(compression());
app.use(json());
app.use(cookieParser());
app.use(helmet());

app.use(urlencoded({ extended: true }));

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
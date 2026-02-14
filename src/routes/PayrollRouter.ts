import { Router } from "express";
import { validateModule } from "../schemas/ModuleSchema";
import { db } from "../config/firebase";
import Cache from "../utils/Cache";
import UR from "../repositories/UserRepository";
import MR from "../repositories/ModuleRepository";
import VM from "../middlewares/ValidationMiddlewares";
import ER from "../repositories/EmployeeRepository";
import PC from "../controllers/PayrollController";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });
const UserRepository = new UR(db);
const ModuleRepository = new MR(db);
const EmployeeRepository = new ER(db);
const ModuleValidator = new VM(validateModule, ModuleRepository);
const PayrollValidator = new VM(validateModule, UserRepository);
const PayrollController = new PC(EmployeeRepository, ModuleRepository, new Cache());

export const router = Router();

router.get(
    "/modules",
    PayrollValidator.validatePermissions({ acceptedPermissions: 
        ["admin", "ADMIN", "Admin", "GERENTE", "Gerente", "gerente"] }),
    PayrollController.getModules
);

router.post(
    "/modules/:id",
    upload.array("assistance"),
    ModuleValidator.validateExistenceByID,
    PayrollValidator.validatePermissions({ acceptedPermissions: 
        ["admin", "ADMIN", "Admin", "GERENTE", "Gerente", "gerente"] }),
    PayrollController.calculatePayroll
);
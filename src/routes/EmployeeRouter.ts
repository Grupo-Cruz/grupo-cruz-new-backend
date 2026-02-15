import { Router } from "express";
import { db, auth, bucket } from "../config/firebase";
import { validateEmployee, validatePartialEmployee } from "../schemas/EmployeeSchema";
import Cache from "../utils/Cache";
import EC from "../controllers/EmployeeController";
import ER from "../repositories/EmployeeRepository";
import UR from "../repositories/UserRepository";
import MR from "../repositories/ModuleRepository";
import VM from "../middlewares/ValidationMiddlewares";
import multer from 'multer';

const EmployeeRepository = new ER(db);
const UserRepository = new UR(db, "users");
const ModuleRepository = new MR(db, "modules");
const EmployeeController = new EC(bucket, EmployeeRepository, UserRepository, ModuleRepository, auth, new Cache());

const EmployeeValidator = new VM(validateEmployee, EmployeeRepository);
const EmployeeUpdaterValidator = new VM(validatePartialEmployee, EmployeeRepository);

const upload = multer({ storage: multer.memoryStorage() });

export const router = Router();

router.post(
    "/",
    upload.single("photo"),
    EmployeeValidator.validatePermissions({ acceptedPermissions: ["admin", "ADMIN", "Admin", "gerente", "GERENTE", "Gerente"] }),
    EmployeeValidator.validateData,
    EmployeeController.create
);

router.get(
    "/",
    EmployeeValidator.validatePermissions({ acceptedPermissions: ["admin", "ADMIN", "Admin", "gerente", "GERENTE", "Gerente"] }),
    EmployeeController.getAll
);

router.get(
    "/:id",
    EmployeeValidator.validatePermissions({ acceptedPermissions: ["admin", "ADMIN", "Admin", "gerente", "GERENTE", "Gerente"], matchId: true, excludeAcceptedPermissionsFromMatchId: true }),
    EmployeeValidator.validateExistenceByID,
    EmployeeController.getById
);

router.put(
    "/:id",
    upload.single("photo"),
    EmployeeValidator.validatePermissions({ acceptedPermissions: ["admin", "ADMIN", "Admin", "gerente", "GERENTE", "Gerente"], matchId: true, excludeAcceptedPermissionsFromMatchId: true }),
    EmployeeValidator.validateExistenceByID,
    EmployeeUpdaterValidator.validateData,
    EmployeeController.updateById
);

router.delete(
    "/:id",
    EmployeeValidator.validatePermissions({ acceptedPermissions: ["admin", "ADMIN", "Admin", "gerente", "GERENTE", "Gerente"], matchId: true, excludeAcceptedPermissionsFromMatchId: true }),
    EmployeeValidator.validateExistenceByID,
    EmployeeController.deleteById
);
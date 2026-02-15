import { Router } from "express";
import { db } from "../config/firebase";
import { bucket } from "../config/firebase";
import { validateModule, validatePartialModule } from "../schemas/ModuleSchema";
import Cache from "../utils/Cache";
import MC from "../controllers/ModuleController";
import MR from "../repositories/ModuleRepository";
import VM from "../middlewares/ValidationMiddlewares";
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
const ModuleRepository = new MR(db);
const ModuleController = new MC(bucket, ModuleRepository, new Cache());
const ModuleValidator = new VM(validateModule, ModuleRepository);
const ModuleUpdaterValidator = new VM(validatePartialModule, ModuleRepository);

export const router = Router();

router.post(
    "/",
    upload.single("image"),
    ModuleValidator.validateData,
    ModuleController.create
);

router.get(
    "/",
    ModuleController.getAll
);

router.get(
    "/:id",
    ModuleValidator.validateExistenceByID,
    ModuleController.getById
);

router.put(
    "/:id",
    upload.single("image"),
    ModuleValidator.validatePermissions({ acceptedPermissions: ["admin", "ADMIN", "Admin", "GERENTE", "gerente", "Gerente"] }),
    ModuleValidator.validateExistenceByID,
    ModuleUpdaterValidator.validateData,
    ModuleController.updateById
);

router.delete(
    "/:id",
    ModuleValidator.validatePermissions({ acceptedPermissions: ["admin", "ADMIN", "Admin", "GERENTE", "gerente", "Gerente"] }),
    ModuleValidator.validateExistenceByID,
    ModuleController.deleteById
);
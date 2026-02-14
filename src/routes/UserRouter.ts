import { Router } from "express";
import { bucket, db } from "../config/firebase";
import { validateUser, validatePartialUser } from "../schemas/UserSchema";
import { Permissions } from "../index.d";
import Cache from "../utils/Cache";
import Limiters from "../middlewares/RateLimiter";
import multer from 'multer';
import UC from "../controllers/UserController";
import UR from "../repositories/UserRepository";
import VM from "../middlewares/ValidationMiddlewares";

const upload = multer({ storage: multer.memoryStorage() });
const UserRepository = new UR(db, "users");
const UserController = new UC(bucket, UserRepository, new Cache());
const UserValidator = new VM(validateUser, UserRepository);
const UserUpdateValidator = new VM(validatePartialUser, UserRepository);

export const router = Router();

router.use(Limiters.defaultLimiter);

router.post(
    "/",
    upload.single("photo"),
    UserValidator.validateData,
    UserValidator.validateExistenceByField({ fieldName: "email", shouldExists: false }),
    UserController.create
);

const adminOnly = ["Admin"].flatMap(value => [value, value.toUpperCase(), value.toLowerCase()]) as Array<Permissions>;
const adminAndGerente = adminOnly.concat(["Gerente"].flatMap(value => [value, value.toUpperCase(), value.toLowerCase()]) as Array<Permissions>);

router.get(
    "/",
    UserValidator.validatePermissions({ acceptedPermissions: adminAndGerente }),
    UserController.getAll
);

router.get(
    "/:id",
    UserValidator.validatePermissions({ acceptedPermissions: adminAndGerente, matchId: true, excludeAcceptedPermissionsFromMatchId: true }),
    UserValidator.validateExistenceByID,
    UserController.getById
);

router.put(
    "/:id",
    upload.single("photo"),
    UserValidator.validatePermissions({ acceptedPermissions: adminOnly, matchId: true, excludeAcceptedPermissionsFromMatchId: true }),
    UserValidator.validateExistenceByID,
    UserUpdateValidator.validateData,
    UserController.updateById
);

router.delete(
    "/:id",
    UserValidator.validatePermissions({ acceptedPermissions: adminOnly, matchId: true, excludeAcceptedPermissionsFromMatchId: true }),
    UserValidator.validateExistenceByID,
    UserController.deleteById
);
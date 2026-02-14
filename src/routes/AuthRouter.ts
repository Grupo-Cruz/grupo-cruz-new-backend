import { Router } from 'express';
import { db, bucket } from '../config/firebase';
import { validateRegisterData } from '../schemas/AuthSchema';
import Cache from '../utils/Cache';
import Limiters from '../middlewares/RateLimiter';
import AC from "../controllers/AuthController";
import UR from "../repositories/UserRepository";
import UC from '../controllers/UserController';
import VM from "../middlewares/ValidationMiddlewares";
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
const UserRepository = new UR(db, "users");
const UserValidator = new VM(validateRegisterData, UserRepository);
const UserController = new UC(bucket, UserRepository, new Cache());
const AuthController = new AC(UserRepository, UserController);
export const router = Router();

router.post(
    "/login",
    Limiters.loginLimiter(db),
    UserValidator.validateExistenceByField({ fieldName: "email", shouldExists: true }),
    AuthController.logIn
);

router.post(
    "/register",
    upload.single('photo'),
    UserValidator.validateData,
    UserValidator.validateExistenceByField({ fieldName: "email", shouldExists: false }),
    AuthController.register
);
import { Router } from "express";
import { validateCountry, validatePartialCountry } from "../schemas/CountrySchema";
import { UserPermissions } from "../index.d";
import { db } from "../config/firebase";
import Cache from "../utils/Cache";
import CC from "../controllers/CountryController";
import CR from "../repositories/CountryRepository";
import VM from "../middlewares/ValidationMiddlewares";

const CountryRepository = new CR(db)
const CountryController = new CC(CountryRepository, new Cache());
const CountryValidator = new VM(validateCountry, CountryRepository);
const CountryUpdaterValidator = new VM(validatePartialCountry, CountryRepository);

export const router = Router();

router.post(
    "/",
    CountryValidator.validateData,
    CountryController.create
);

router.get(
    "/",
    CountryController.getAll
);

router.get(
    "/:id",
    CountryValidator.validateExistenceByID,
    CountryController.getById
);

const adminOnly = ["Admin", "Administrator", "Administrador"].flatMap(value => [value, value.toUpperCase(), value.toLowerCase()]) as Array<UserPermissions> 

router.put(
    "/:id",
    CountryValidator.validatePermissions({ acceptedPermissions: adminOnly }),
    CountryValidator.validateExistenceByID,
    CountryUpdaterValidator.validateData,
    CountryController.updateById
);

router.delete(
    "/:id",
    CountryValidator.validatePermissions({ acceptedPermissions: adminOnly }),
    CountryValidator.validateExistenceByID,
    CountryController.deleteById
);
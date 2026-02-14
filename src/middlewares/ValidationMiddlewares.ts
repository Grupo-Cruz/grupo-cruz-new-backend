import { Request, Response, NextFunction } from "express";
import { Repository, Validator, Permissions } from "../index.d";

interface validateExistenceByFieldParams {
    fieldName: string
    shouldExists: boolean
    excludedValues?: Array<any>
    limit?: number
}

interface validatePermissionsParams {
    acceptedPermissions: "*" | Array<"*" | Permissions>
    matchId?: boolean
    excludeAcceptedPermissionsFromMatchId?: boolean
}

/**
 * @class Clase que cuenta con varios middlewares que permiten validar información antes de poder realizar cualquier operación CRUD.
 * @constructor Recibe 2 parámetros: repository y validator.
 * @param {Repository} repository Instancia de la clase Repository.
 * @param {Validator} validator Instancia de la clase Validator.
 */
export default class ValidationMiddlewares<Input, Output, RepositoryType> {
    private validator: Validator<Input, Output>;
    private repository: Repository<RepositoryType>;

    constructor (validator: Validator<Input, Output>, repository: Repository<RepositoryType>) {
        this.validator = validator;
        this.repository = repository;
    }

    /** Middleware que valida que los datos del cuerpo de la petición cumplan con la estructura definida por el validator.
     * Si todo sale bien, req.body se sobrescribe con los datos validados por el validator, si ocurre un error al parsear el req.body, se regresa un estado 400.
     */
    validateData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const result = await this.validator(req.body);

        if (!result.success) {
            res.status(400).json({ error: JSON.parse(result.error.message) });
            return;
        }

        req.body = result.data;
        next();
    }

    /** Función que valida la existencia de un elemento por el id pasado por el parámetro en el req.params.
     * Si no existe un elemento con esa id devuelve un error 404.
     */
    validateExistenceByID = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        let { id } = req.params;

        if (typeof id !== 'string') id = id[0];

        if (!id) {
            res.status(400).json({ message: "No se especificó un ID", error: 'Se requiere especificar un ID' });
            return;
        }

        const response = await this.repository.getById(id);

        if (!response.success) {
            res.status(500).json({ message: "Ocurrió un error al consultar la existencia, lamentamos las molestias", error: response.error });
            return;
        }

        const { data: element } = response;

        if (element === null || element === undefined) {
            res.status(400).json({ message: "No se encontró ningún elemento con el ID especificado" });
            return;
        }

        next();
    }

    /** Middleware que valida la existencia de uno o más elementos en base al campo pasado como parámetro.
     * @param {string} fieldName Nombre del campo que de debe buscar.
     * @param {boolean} shouldExists Indica si debe existir o no algún elemento con dicho valor de campo.
     * @param {Array<any> | undefined} excludedValues Los valores a excluir de la búsqueda (si aplica).
     * @param {number | undefined} limit El límite de elementos que deben de haber con dicho nombre de campo. Su valor por defecto es 1
     * @returns El middleware en cuestión
     */
    validateExistenceByField = ({ fieldName, shouldExists, excludedValues, limit = 1 }: validateExistenceByFieldParams) => {
        return async (req: Request, res: Response, next: NextFunction) => {
            const fieldFinder = req.body[fieldName];

            if (!fieldFinder) {
                res.status(400).json({ message: `No se encontró ningún campo llamado "${fieldName}" en el cuerpo de la petición` });
                return;
            }

            if (!excludedValues?.includes(fieldFinder)) {
                const result = await this.repository.getByField({ fieldName, fieldFinder, limit });

                if (!result.success) {
                    res.status(500).json({ message: "Ocurrió un error al consultar la existencia, lamentamos las inconvenientes", error: result.error });
                    return;
                }

                const { data } = result;

                if (shouldExists && data.length === 0) {
                    res.status(400).json({ message: "No se encontró ningún elemento que coincida con el campo especificado" });
                    return;
                } else if (shouldExists && data.length > limit) {
                    res.status(400).json({ message: "Ya existen varios elementos que cumplen con esta condición" });
                    return;
                } else if (!shouldExists && data.length > 0) {
                    res.status(400).json({ message: "Ya existe un elemento que cumple con esta condición" });
                    return;
                }
            }

            next();
        }
    }

    /**
     * Middleware que valida los permisos de un usuario antes de realizar cualquier acción (leer, borrar, crear, actualizar)
     * @param {"*" | Array<"*" | Permissions>} acceptedPermissions Los permisos requeridos para realizar la acción
     * @param {boolean | undefined} matchId Si se especifica, el Id del usuario autenticado debe coincidir estrictamente con el id pasado como parámetro
     * @param {boolean | undefined} excludeAcceptedPermissionsFromMatchId Si se especifica, el matchId se omite, siempre y cuando, los permisos del usuario esté dentro de los especificados en el parámetro acceptedPermissions
     * @returns El middleware en cuestión, valida si el usuario está autenticado, si no lo está devuelve un estado 401. Si el usuario está autenticado pero no cuenta con los permisos necesarios devuelve un estado 403
     */
    validatePermissions = ({ acceptedPermissions, matchId, excludeAcceptedPermissionsFromMatchId }: validatePermissionsParams) => {
        return async (req: Request, res: Response, next: NextFunction) => {
            const user = req.session?.user;

            if (!user) {
                res.status(401).json({ message: "Usuario no autenticado, inicie sesión primero" });
                return;
            }

            const acceptAll = acceptedPermissions.length === 1 && acceptedPermissions[0]?.trim() === "*";

            if (matchId) {
                const isExcluded = excludeAcceptedPermissionsFromMatchId && (acceptAll || acceptedPermissions.includes(user.permissions));

                if (!isExcluded && req.params.id !== user.id) {
                    res.status(403).json({ message: "Lo sentimos, no cuentas con los permisos necesarios para realizar esta acción" });
                    return;
                }
            } else {
                if (!acceptAll && !acceptedPermissions.includes(user.permissions)) {
                    res.status(403).json({ message: "Lo sentimos, no cuentas con los permisos necesarios para realizar esta acción" });
                    return;
                }
            }

            next();
        }
    }
}
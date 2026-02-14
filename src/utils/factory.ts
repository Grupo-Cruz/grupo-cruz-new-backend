import { Request, Response } from "express";
import { Firestore, Query } from "firebase-admin/firestore";
import { Repository, Controller, GetAllDelimiters, GetByFieldDelimiters, Error, Success, Cache } from "../index.d";
import { logger } from "./logger";

/**
 * Clase `FactoryController`:
 * 
 * Implementa lógica común y reutilizable para controladores CRUD, facilitando la integración con caché y el manejo de errores.
 * 
 * @template T Tipo de datos que maneja el controlador.
 */
export class FactoryController<T> implements Controller<T> {
    protected repository: Repository<T>;
    protected BASE_KEY: string;
    protected cache: Cache;

    /**
     * Constructor de la clase.
     * 
     * @param {Repository<T>} repository Repositorio que implementa la lógica de acceso a datos.
     * @param {string} baseKey Prefijo para construir claves únicas en caché.
     * @param {Cache} cache Instancia de caché para guardar datos temporalmente.
     */
    constructor (repository: Repository<T>, baseKey: string, cache: Cache) {
        this.repository = repository;
        this.BASE_KEY = baseKey;
        this.cache = cache;

        // Se hace el bind de los métodos al contexto de la instancia
        this.create = this.create.bind(this);
        this.getAll = this.getAll.bind(this);
        this.getById = this.getById.bind(this);
        this.updateById = this.updateById.bind(this);
        this.deleteById = this.deleteById.bind(this);
    }

    /**
     * Crea un nuevo recurso.
     * @param {Express.Request} req
     * @param {Express.Response} res
     */
    async create (req: Request<unknown, any, T>, res: Response) {
        const data = req.body;
        const result = await this.repository.create(data);
        const cacheKey = `${this.BASE_KEY}:all`

        if (!result.success) {
            logger.error("Error al crear el elemento", { error: result.error });
            res.status(500).json({ message: "Ocurrió un error al crear el elemento, lamentamos las molestias", error: result.error });
        } else {
            await this.cache.del(cacheKey); // Limpia la caché global
            res.status(201).json({ message: "Elemento creado correctamente", data: result.data });
        }
    }

    /**
     * Obtiene todos los elementos con soporte para filtros, paginación y caché.
     * @param {Express.Request} req
     * @param {Express.Response} res
     */
    async getAll (req: Request, res: Response) {
        const { limit, startAfter, ...filterQuery } = req.query;

         // Construye los filtros
        const filters = Object.entries(filterQuery).map(([field, value]) => ({
            field,
            value: String(value)
        }));

        const delimiters = {
            limit: limit ? parseInt(String(limit)) : undefined,
            startAfter: startAfter ? String(startAfter) : undefined,
            filters: filters.length ? filters : undefined
        };

        // Construye la clave de caché dinámica
        let cacheKey = `${this.BASE_KEY}:all`;
        if (delimiters.limit) cacheKey += `:limit=${delimiters.limit}`;
        if (delimiters.startAfter) cacheKey += `:startAfter=${startAfter}`;
        if (delimiters.filters) {
            delimiters.filters.forEach(filter => { 
                cacheKey += `:${filter.field}=${filter.value}` 
            });
        }

        // Revisa si ya está en caché
        const cached = await this.cache.get<T>(cacheKey);

        if (cached) {
            res.status(200).json({ message: "Elementos recuperados desde caché", data: cached });
            return;
        }

        // Si no está en caché, consulta al repositorio
        const result = await this.repository.getAll(delimiters);

        if (!result.success) {
            res.status(500).json({ message: "Ocurrió un error al consultar los elementos, lamentamos los inconvenientes", error: result.error });
        } else {
            await this.cache.set(cacheKey, result.data, 600, (value) => console.log(`Valor expirado: ${value}`));
            res.status(200).json({ message: "Elementos recuperados de la base de datos", data: result.data });
        }
    }

    /**
     * Obtiene un recurso por su ID, usando caché si está disponible.
     * @param {Express.Request} req
     * @param {Express.Response} res
     */
    async getById (req: Request, res: Response) {
        let { id } = req.params;

        if (typeof id !== 'string') id = id[0];

        const cacheKey = `${this.BASE_KEY}:id=${id}`;
        const cached = await this.cache.get<T>(cacheKey);

        if (cached) {
            res.status(200).json({ message: "Elemento recuperado desde caché", data: cached });
            return;
        }

        const result = await this.repository.getById(id);

        if (!result.success) {
            res.status(500).json({ message: "Ocurrió un error al consultar el elemento, lamentamos lo sucedido", error: result.error });
        } else {
            await this.cache.set(cacheKey, result.data, { time: 6, unit: "Minutes", onExpire: (value) => console.log(`Valor expirado: ${value}`) });
            res.status(200).json({ message: "Elemento recuperado de la base de datos", data: result.data });
        }
    }

    /**
     * Actualiza un recurso por su ID.
     * @param {Express.Request} req
     * @param {Express.Response} res
     */
    async updateById (req: Request<any, any, PartialOrComplete<T>>, res: Response) {
        const { id } = req.params;
        const data = req.body;
        const cacheKeyAll = `${this.BASE_KEY}:all`;
        const cacheKeyId = `${this.BASE_KEY}:id=${id}`;
        const result = await this.repository.updateById(id, data);

        if (!result.success) {
            res.status(500).json({ message: "Ocurrió algo inesperado mientras se actualizaba el elemento, lamentamos lo sucedido", error: result.error });
        } else {
            await this.cache.del(cacheKeyAll, cacheKeyId); // Invalida caché relacionada
            res.status(200).json({ message: "Elemento actualizado satisfactoriamente", data: result.data });
        }
    }

    /**
     * Elimina un recurso por su ID.
     * @param {Express.Request} req
     * @param {Express.Response} res
     */
    async deleteById (req: Request, res: Response) {
        let { id } = req.params;

        if (typeof id !== 'string') id = id[0];

        const cacheKeyAll = `${this.BASE_KEY}:all`;
        const cacheKeyId = `${this.BASE_KEY}:id=${id}`;
        const result = await this.repository.deleteById(id);

        if (!result.success) {
            res.status(500).json({ message: "Ocurrió algo inesperado al eliminar el elemento, intente nuevamente", error: result.error });
        } else {
            await this.cache.del(cacheKeyAll, cacheKeyId); // Invalida caché
            res.status(200).json({ message: "Elemento eliminado correctamente" });
        }
    }
}

/**
 * Clase `FactoryRepository`:
 * 
 * Implementa lógica base y reutilizable para operaciones CRUD con Firestore.
 * 
 * @template T Tipo de datos almacenados en la colección.
 */
export class FactoryRepository<T extends Record<string, any>> implements Repository<T> {
    protected db: Firestore;
    protected collectionName: string;

    /**
     * Constructor del repositorio.
     * 
     * @param {Firestore} db Instancia de Firestore.
     * @param {string} collectionName Nombre de la colección en la base de datos.
     */
    constructor (db: Firestore, collectionName: string) {
        this.db = db;
        this.collectionName = collectionName;

        // Bindeo de métodos
        this.create = this.create.bind(this);
        this.getAll = this.getAll.bind(this);
        this.getById = this.getById.bind(this);
        this.getByField = this.getByField.bind(this);
        this.deleteById = this.deleteById.bind(this);
        this.updateById = this.updateById.bind(this);
    }

    /**
     * Crea un nuevo documento en la colección.
     * 
     * @param {T} data El valor que se va a guardar en la base de datos.
     * @returns {Promise<Success<T> | Error<T>>} Una promesa con los datos más una ID si todo sale bien, un Error si algo sale mal.
     */
    async create (data: T): Promise<Success<T> | Error<T>> {
        try {
            const doc = await this.db.collection(this.collectionName).add(data);

            return { data: { ...data, id: doc.id }, success: true } as Success<T>;
        } catch (error) {
            logger.error("Error al crear el elemento", { error });
            return { error } as Error<T>;
        }
    }

    /**
     * Obtiene todos los documentos con filtros y paginación.
     * 
     * @param {GetAllDelimiters | undefined} delimiters Los valores de filtro y paginación.
     * @returns {Promise<Error<T> | Success<Array<T>>>} Una promesa con un Array de datos que cumplen con los filtros y paginación (aunque limit sea 1 igual devuelve un array) o un Error en caso de que algo salga mal.
     */
    async getAll (delimiters?: GetAllDelimiters): Promise<Error<T> | Success<Array<T>>> {
        try {
            let query: Query = this.db.collection(this.collectionName);

            if (delimiters?.filters) {
                delimiters.filters.forEach(({ field, value }) => { 
                    query = query.where(field, "==", value) 
                });
            }

            if (delimiters?.limit) query = query.limit(delimiters.limit);

            if (delimiters?.startAfter) {
                const startDoc = await this.db.collection(this.collectionName).doc(delimiters.startAfter).get();
                if (startDoc.exists) {
                    query = query.startAfter(startDoc);
                }
            }

            const querySnapshot = await query.get();
            const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as T }));

            return { data: docs, success: true } as Success<Array<T>>;
        } catch (error) {
            logger.error("Error al obtener los elementos", { error });
            return { error } as Error<T>;
        }
    }

    /**
     * Obtiene un documento por su ID.
     * @param {string} id El ID del elemento a buscar.
     * @returns {Promise<Error<T> | Success<T>>} Una promesa con el elemento encontrado o con un Error si algo sale mal.
     */
    async getById (id: string): Promise<Error<T> | Success<T>> {
        try {
            const doc = await this.db.collection(this.collectionName).doc(id).get();

            return { data: doc.data(), success: true } as Success<T>;
        } catch (error) {
            logger.error("Error al obtener el elemento por su id", { error });
            return { error } as Error<T>;
        }
    }

    /**
     * Obtiene documentos filtrados por un campo específico.
     * @param {GetByFieldDelimiters} delimiters Los filtros que se van a usar para filtrar.
     * @returns {Promise<Error<T> | Success<Array<T>>>} Una promesa con un array de los elementos que coinciden (aunque limit sea 1) o un Error en caso de que algo salga mal.
     */
    async getByField ({ fieldName, fieldFinder, limit = 10 }: GetByFieldDelimiters): Promise<Error<T> | Success<Array<T>>> {
        try {
            const querySnapshot = await this.db.collection(this.collectionName).where(fieldName, "==", fieldFinder).limit(limit).get();
            const docs = querySnapshot.docs.map(doc => doc.data());

            return { data: docs, success: true }as Success<Array<T>>;
        } catch (error) {
            logger.error("Error al obtener elementos por nombre de campo", { error });
            return { error } as Error<T>;
        }
    }

    /**
     * Elimina un documento por su ID.
     * @param {string} id El ID dek elemento a eliminar.
     * @returns {Promise<Error<T> | Success<undefined>>} Una promesa vacía si el elemento se eliminó o un Error si algo malo ocurrió
     */
    async deleteById (id: string): Promise<Error<T> | Success<undefined>> {
        try {
            await this.db.collection(this.collectionName).doc(id).delete();

            return { success: true } as Success<undefined>;
        } catch (error) {
            logger.error("Error al eliminar elemento por su id", { error });
            return { error } as Error<T>;
        }
    }

    /**
     * Actualiza un documento por su ID.
     * @param {string} id el ID del elemento a actualizar.
     * @param {T | Partial<T>} data Los datos a actualizar.
     * @returns {Promise<Error<T> | Success<T | Partial<T>>>} Una promesa con los datos actualizados o un error si algo sale mal.
     */
    async updateById (id: string, data: PartialOrComplete<T>): Promise<Error<T> | Success<T | Partial<T>>> {
        try {
            await this.db.collection(this.collectionName).doc(id).update(data);

            return { data, success: true } as Success<PartialOrComplete<T>>;
        } catch (error) {
            logger.error("Error al actualizar elemento por su id", { error });
            return { error } as Error<T>;
        }
    }
}
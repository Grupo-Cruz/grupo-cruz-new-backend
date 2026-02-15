import { Request, Response } from "express";
import { Repository, Employee, User, Controller, Module, ReturnType, Cache } from "../index.d";
import { FactoryController } from "../utils/factory";
import { Auth } from "firebase-admin/lib/auth/auth";
import { Bucket } from "@google-cloud/storage";
import { v4 as uuidv4 } from "uuid";
import { UserRecord } from "firebase-admin/lib/auth/user-record";

/**
 * Este controlador maneja dos flujos:
 * 1. Si se pasa un `id`, se asume que el usuario ya existe y solo se crea el empleado.
 * 2. Si se pasa `name`, `email` y `permissions`, se crea primero el usuario, y luego el empleado.
 */
export default class EmployeeController extends FactoryController<Employee> implements Controller<Employee> {
    private DEFAULT_IMAGE = "https://www.pngfind.com/pngs/m/610-6104451_image-placeholder-png-user-profile-placeholder-image-png.png";
    private bucket: Bucket;
    private userRepository: Repository<User>;
    private moduleRepository: Repository<Module>
    private auth: Auth;

    constructor (bucket: Bucket, employeeRepository: Repository<Employee>, userRepository: Repository<User>, moduleRepository: Repository<Module>, auth: Auth, cache: Cache, baseKey: string = "employees") {
        super (employeeRepository, baseKey, cache);
        this.bucket = bucket;
        this.userRepository = userRepository;
        this.auth = auth;
        this.moduleRepository = moduleRepository;
    }

    override create = async (req: Request<any, any, Partial<Employee> & { password?: string }>, res: Response) => {
        const data = req.body;
        let userId = data.id;

        if (!userId) {
            try {
                let firebaseUser: UserRecord;

                if (data.email) {
                    firebaseUser = await this.auth.createUser({
                        email: data.email,
                        emailVerified: false,
                        password: data.password || uuidv4(),
                        displayName: data.name
                    });
                } else {
                    firebaseUser = await this.auth.createUser({
                        displayName: data.name
                    });
                }

                const userDoc = await this.userRepository.create({
                    id: firebaseUser.uid,
                    name: data.name!,
                    emailVerifiedNotified: false,
                    email: data.email || "",
                    permissions: data.permissions!,
                    photo: "",
                    relativePhoto: ""
                });

                if (!userDoc.success) {
                    res.status(500).json({ message: "Error al crear documento de usuario", error: userDoc.error });
                    return;
                }

                userId = userDoc.data.id;
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Error al crear usuario en Firebase Auth", error });
                return;
            }
        }

        let photo: string | undefined, relativePhoto: string | undefined;

        if (!data.photo) {
            const photoData = await this.saveImageAndGetURL(req.file, userId);
            photo = photoData.photo;
            relativePhoto = photoData.relativePhoto;
        }

        const employeeData: Employee = {
            id: userId,
            modules: data.modules || [],
            schedule: data.schedule || [],
            code: data.code!,
            role: data.role!,
            email: data.email || "",
            name: data.name!,
            permissions: data.permissions!,
            photo: data.photo || photo || "",
            semanalSalary: data.semanalSalary!,
            relativePhoto: data.relativePhoto || relativePhoto || "",
            active: data.active ?? true,
            imss: data.imss ?? false
        };

        const result = await this.repository.create(employeeData);

        if (!result.success) {
            res.status(500).json({ message: "Error al registrar al empleado", error: result.error });
            return;
        }

        const results = await Promise.all(employeeData.modules.map(async moduleId => {
            let result: ReturnType<Nullable<Module>> | ReturnType<PartialOrComplete<Module>> = await this.moduleRepository.getById(moduleId);

            if (!result.success) return result;

            const module = result.data as Module;
            const employee = module.employees;
            employee.push({ id: employeeData.id, code: employeeData.code });
            module.employees = employee;

            return await this.moduleRepository.updateById(moduleId, module);
        }));

        for (const response of results) {
            if (!response.success) {
                res.status(201).json({ message: "Empleado creado correctamente, pero ocurrió un error inesperado al agregarlo a los módulos. Favor de contactarnos para los detalles", data: result.data });
                return;
            }
        }

        res.status(201).json({ message: "Empleado creado correctamente", data: result.data });
    }

    override updateById = async (req: Request<any, any, Partial<Employee>>, res: Response) => {
        const { id } = req.params;
        const data = req.body;

        if (req.file) {
            const result = await this.repository.getById(id);

            if (!result.success) {
                res.status(500).json({ message: "Ocurrió un error inesperado al actualizar el usuario, lamento los inconvenientes", error: result.error });
                return;
            }

            const oldImagePath = result.data?.relativePhoto;
            const { photo, relativePhoto } = await this.updateImageAndGetURL(req.file, id, oldImagePath);
            data.photo = photo;
            data.relativePhoto = relativePhoto;
        }

        const result = await this.repository.updateById(id, data);

        if (!result.success) {
            res.status(500).json({ message: "Ocurrió un error inesperado al actualizar el usuario, lamento los inconvenientes", error: result.error });
        } else {
            res.status(200).json({ message: "Usuario actualizado correctamente: ", data: result.data });
        }
    }

    private uploadFileAndGetURL = async (file: Express.Multer.File, path: string): Promise<{ photo: string, relativePhoto: string }> => {
        const token = uuidv4();
        const blob = this.bucket.file(path);
        const blobStream = blob.createWriteStream({
            metadata: {
                contentType: file.mimetype,
                metadata: {
                    firebaseStorageDownloadTokens: token
                }
            }
        });

        return new Promise((resolve, reject) => {
            blobStream.on('error', (e) => reject(`Error al subir la imagen: ${e}`));

            blobStream.on('finish', () => {
                const encodedPath = encodeURIComponent(path);
                const photoURL = `https://firebasestorage.googleapis.com/v0/b/${this.bucket.name}/o/${encodedPath}?alt=media&token=${token}`;
                resolve({ photo: photoURL, relativePhoto: encodedPath });
            });

            blobStream.end(file.buffer);
        });
    }

    private updateImageAndGetURL = async (newFile: Express.Multer.File, uid: string, oldImagePath?: string): Promise<{ photo: string, relativePhoto: string }> => {
        if (oldImagePath) {
            try {
                const oldFile = this.bucket.file(oldImagePath);
                const [exists] = await oldFile.exists();
                if (exists) await oldFile.delete();
            } catch (error) {
                console.warn(`No se pudo eliminar la imagen anterior: ${error}`);
            }
        }

        return await this.uploadFileAndGetURL(newFile, `employee/${uid}/${newFile.originalname}`);
    }

    private saveImageAndGetURL = async (file: Express.Multer.File | undefined, uid: string): Promise<{ photo: string; relativePhoto?: string }> => {
        if (!file) return { photo: this.DEFAULT_IMAGE };

        try {
            return await this.uploadFileAndGetURL(file, `employee/${uid}/${file.originalname}`);
        } catch (error: any) {
            console.warn("Fallo al subir la imagen:", error);
            return { photo: this.DEFAULT_IMAGE };
        }
    };
}

import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from "express";
import { Cache, Controller, Module, Repository, ReturnType } from "../index.d";
import { Bucket } from "@google-cloud/storage";
import { FactoryController } from "../utils/factory";

export default class ModuleController extends FactoryController<Module> implements Controller<Module> {
    private DEFAULT_IMAGE = "https://th.bing.com/th/id/OIP.fLz_nyWcsH8YBnUzKD8eCAHaFl?rs=1&pid=ImgDetMain";
    private bucket: Bucket;

    constructor (bucket: Bucket, repository: Repository<Module>, cache: Cache, baseKey: string = "modules") {
        super (repository, baseKey, cache);
        this.bucket = bucket;
    }

    override create = async (req: Request<unknown, any, Optional<Module, "image" | "relativeImage">>, res: Response) => {
        let data = req.body;
        let result: ReturnType<Module> | ReturnType<PartialOrComplete<Module>> = await this.repository.create(data);

        if (!result.success) {
            res.status(500).json({ message: "Ocurrió un error inesperado al crear el módulo, lamentamos los inconvenientes", error: result.error });
            return;
        }

        data = result.data as Module;
        try {
            const { image, relativeImage } = await this.saveImageAndGetURL(req.file, data.id);
            data.image = image;
            data.relativeImage = relativeImage || "";
            result = await this.repository.updateById(data.id, data);
    
            if (!result.success) {
                console.log(`Error al guardar la imagen del módulo: ${result.error}`);
            }
    
            res.status(201).json({ message: `Módulo creado exitosamente${result.success ? "" : ", sin embargo, no pudimos guardar la imagen. Lamentamos los inconvenientes"}` })
        } catch (error) {
            console.log(`Error al guardar la imagen del módulo: ${error}`);
            res.status(201).json({ message: `Módulo creado exitosamente${result.success ? "" : ", sin embargo, no pudimos guardar la imagen. Lamentamos los inconvenientes"}` })
        }
    }

    override updateById = async (req: Request<any, any, Partial<Module>>, res: Response) => {
        const { id } = req.params;
        const data = req.body;

        if (req.file) {
            const result = await this.repository.getById(id);

            if (!result.success) {
                res.status(500).json({ message: "Ocurrió un error inesperado al actualizar el módulo, lamento los inconvenientes", error: result.error });
                return;
            }

            const oldImagePath = result.data?.relativeImage;
            const { image, relativeImage } = await this.updateImageAndGetURL(req.file, id, oldImagePath);
            data.image = image;
            data.relativeImage = relativeImage;
        }

        const result = await this.repository.updateById(id, data);

        if (!result.success) {
            res.status(500).json({ message: "Ocurrió un error inesperado al actualizar el módulo, lamentamos las molestias ", error: result.error });
        } else {
            res.status(200).json({ message: "Módulo actualizado exitosamente", data: result.data });
        }
    }

    private uploadFileAndGetURL = async (file: Express.Multer.File, path: string): Promise<{ image: string, relativeImage: string }> => {
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
            blobStream.on('error', () => reject("Error al subir la imagen"));

            blobStream.on('finish', () => {
                const encodedPath = encodeURIComponent(path);
                const imageURL = `https://firebasestorage.googleapis.com/v0/b/${this.bucket.name}/o/${encodedPath}?alt=media&token=${token}`;
                resolve({ image: imageURL, relativeImage: encodedPath });
            });

            blobStream.end(file.buffer);
        });
    }

    private updateImageAndGetURL = async (newFile: Express.Multer.File, id: string, oldImagePath?: string): Promise<{ image: string, relativeImage: string }> => {
        if (oldImagePath) {
            try {
                const oldFile = this.bucket.file(oldImagePath);
                const [exists] = await oldFile.exists();
                if (exists) await oldFile.delete();
            } catch (error) {
                console.warn(`No se pudo eliminar la imagen anterior: ${error}`);
            }
        }

        return await this.uploadFileAndGetURL(newFile, `module/${id}/${newFile.originalname}`);
    }

    private saveImageAndGetURL = async (file: Express.Multer.File | undefined, id: string): Promise<{ image: string; relativeImage?: string }> => {
        if (!file) return { image: this.DEFAULT_IMAGE };
        return await this.uploadFileAndGetURL(file, `module/${id}/${file.originalname}`);
    }
}
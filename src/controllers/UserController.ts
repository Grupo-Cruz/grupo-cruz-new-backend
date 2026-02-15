import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from "express";
import { Repository, User, Controller, Cache } from "../index.d";
import { Bucket } from "@google-cloud/storage";
import { FactoryController } from "../utils/factory";

export default class UserController extends FactoryController<User> implements Controller<User> {
    private DEFAULT_IMAGE = "https://www.pngfind.com/pngs/m/610-6104451_image-placeholder-png-user-profile-placeholder-image-png.png";
    private bucket: Bucket;

    constructor (bucket: Bucket, repository: Repository<User>, cache: Cache, baseKey: string = "users") {
        super (repository, baseKey, cache);
        this.bucket = bucket;
    }

    override create = async (req: Request<unknown, any, User>, res: Response) => {
        const data = req.body;

        const { photo, relativePhoto } = await this.saveImageAndGetURL(req.file, data.id);

        data.photo = photo;
        data.relativePhoto = relativePhoto || "";
        req.body = data;

        super.create(req, res);
    }

    override updateById = async (req: Request<any, any, Partial<User>>, res: Response) => {
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

        super.updateById(req, res);
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

        return this.uploadFileAndGetURL(newFile, `users/${uid}/${newFile.originalname}`);
    }

    private saveImageAndGetURL = async (file: Express.Multer.File | undefined, uid: string): Promise<{ photo: string; relativePhoto?: string }> => {
        if (!file) return { photo: this.DEFAULT_IMAGE };

        try {
            return this.uploadFileAndGetURL(file, `users/${uid}/${file.originalname}`);
        } catch (error: any) {
            console.warn("Fallo al subir la imagen:", error);
            return { photo: this.DEFAULT_IMAGE };
        }
    };
}
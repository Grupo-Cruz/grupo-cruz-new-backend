import { encryptPassword } from "../utils/encrypt";
import { Repository, User, Success, Error } from "../index.d";
import { FactoryRepository } from "../utils/factory";
import { Firestore } from "firebase-admin/firestore";

export default class UserRepository extends FactoryRepository<User> implements Repository<User> {
    constructor (db: Firestore, collectionName: string = "users") {
        super (db, collectionName);
    }

    override create = async (data: User) => {
        try {
            const { password } = data;
            const passwordHashed = await encryptPassword(password);
            data.password = passwordHashed;
            await this.db.collection(this.collectionName).doc(data.id).set(data);

            return { data, success: true } as Success<User>;
        } catch (error) {
            console.log(`Error al crear usuario: ${error}`);
            return { error } as Error<User>;
        }
    }
}
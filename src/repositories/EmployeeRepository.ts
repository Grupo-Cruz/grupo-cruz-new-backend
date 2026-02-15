import { Firestore } from "firebase-admin/firestore";
import { FactoryRepository } from "../utils/factory";
import { Repository, Employee, Success, Error } from "../index.d";

export default class EmployeeRepository extends FactoryRepository<Employee> implements Repository<Employee> {
    constructor (db: Firestore, collectionName: string = "employees") {
        super (db, collectionName);
    }

    override create = async (data: Employee) => {
        try {
            const docRef = this.db.collection(this.collectionName).doc(data.id);
            await docRef.set(data);

            return { data: { ...data, id: docRef.id }, success: true } as Success<Employee>;
        } catch (error) {
            console.log(`Error al crear empleado: ${error}`);
            return { error } as Error<Employee>;
        }
    }
}
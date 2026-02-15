import { Repository, Module } from "../index.d";
import { FactoryRepository } from "../utils/factory";
import { Firestore } from "firebase-admin/firestore";

export default class ModuleRepository extends FactoryRepository<Module> implements Repository<Module> {
    constructor (db: Firestore, collectionName: string = "modules") {
        super (db, collectionName);
    }
}
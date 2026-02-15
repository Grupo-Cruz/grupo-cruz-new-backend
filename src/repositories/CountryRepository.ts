import { Firestore } from "firebase-admin/firestore";
import { FactoryRepository } from "../utils/factory";
import { Repository, Country } from "../index.d";

export default class CountryRepository extends FactoryRepository<Country> implements Repository<Country> {
    constructor (db: Firestore, collectionName: string = "countries") {
        super (db, collectionName);
    }
}
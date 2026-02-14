import { Controller, Country, Repository, Cache } from "../index.d";
import { FactoryController } from "../utils/factory";

export default class CountryController extends FactoryController<Country> implements Controller<Country> {
    constructor (repository: Repository<Country>, cache: Cache, baseKey: string = "countries") {
        super(repository, baseKey, cache);
    }
}
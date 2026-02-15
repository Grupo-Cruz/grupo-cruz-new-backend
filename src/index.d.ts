import { Request, Response } from "express";
import { nullable, SafeParseReturnType } from "zod";

declare global {
    /**
     * Make properties specified in K, optional in T
     */
    type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
    type PartialOrComplete<T> = T | Partial<T>;
    type Nullable<T> = T | null | undefined;

    namespace Express {
        namespace GrupoCruz {
            interface Session {
                user?: { 
                    id: string
                    permissions: Permissions 
                }
                suspiciousEmailSent?: boolean
            }
        }

        interface Request {
            session?: GrupoCruz.Session
        }
    }
}

export interface Country {
    id: string
    name: string
    /* Array que almacena el id de los módulos */
    modules: Array<string>
}

export interface Schedule {
    dayName: string
    startHour?: string
    endHour?: string
}

export interface Assistance {
    dayName: string
    letter: AssistanceLetter
    startHour?: string
    endHour?: string
    date?: string
}

export interface DefaultValues {
    id: string
    name: string
    email: string
    emailVerifiedNotified: boolean
    photo?: string
    /** Para propósitos de borrar la imagen dentro del storage */
    relativePhoto?: string
}

export type AllRoles = User | Gerente | Admin | Master

type UserUnitPermissions = "User" | "Usuario"
export type UserPermissions = UserUnitPermissions | Uppercase<UserUnitPermissions> | Lowercase<UserUnitPermissions>

type GerenteUnitPermissions = "Gerente"
export type GerentePermissions = GerenteUnitPermissions | Uppercase<GerenteUnitPermissions> | Lowercase<GerenteUnitPermissions>

type AdminUnitPermissions = "Admin" | "Administrador" | "Administrator"
export type AdminPermissions = AdminUnitPermissions | Uppercase<AdminUnitPermissions> | Lowercase<AdminUnitPermissions>

type MasterUnitPermissions = "Master" | "Maestro"
export type MasterPermissions = MasterUnitPermissions | Uppercase<MasterUnitPermissions> | Lowercase<MasterUnitPermissions>

export type UnitPermissions = UserUnitPermissions | GerenteUnitPermissions | AdminUnitPermissions | MasterUnitPermissions
export type Permissions = UserPermissions | GerentePermissions | AdminPermissions | MasterPermissions

export interface User extends DefaultValues {
    permissions: UserPermissions
}

export interface Employee extends Omit<Optional<User, "email">, "emailVerifiedNotified"> {
    schedule: Array<Schedule>
    role: string
    /* Array que guarda los id's de los módulos a los que pertenece */
    modules: Array<string>
    code: string
    semanalSalary: number
    active?: boolean
    imss?: boolean
}

export interface Gerente extends DefaultValues {
    permissions: GerentePermissions
}

export interface Admin extends DefaultValues {
    permissions: AdminPermissions
}

export interface Master extends DefaultValues {
    permissions: MasterPermissions
}

export interface Module {
    id: string
    name: string
    description?: string
    image?: string
    /* Para propósitos de borrar la imagen más adelante dentro del storage */
    relativeImage?: string
    /* Array que guarda los id's de los empleados que trabajan en dicho módulo */
    employees: Array<Record<"id" | "code", string>>
    /* Guarda el id del país donde se encuentra el módulo */
    country: string
}

export interface Product {
    id: string
    name: string
    description?: string
    price: number
    image?: string
}

export type AssistanceLetter = "A" | "R1" | "R2" | "R3" | "ND" | "D" | "F"

/*
 * Interfaz que delimita funciones que implementan la mayoría de controladores
 */
export interface Controller<T> {
    create(req: Request, res: Response): Promise<void>

    getAll(req: Request, res: Response): Promise<void>

    getById(req: Request, res: Response): Promise<void>

    updateById(req: Request, res: Response): Promise<void>

    deleteById(req: Request, res: Response): Promise<void>
}

/*
 * Interfaz que delimita funciones que implementan la mayoría de repositorios
 */
export interface Repository<T> {
    create(data: T): Promise<ReturnType<T>>

    getAll(delimiters?: GetAllDelimiters): Promise<ReturnType<Array<T>>>

    getByField(delimiters: GetByFieldDelimiters): Promise<ReturnType<Array<T>>>

    getById(uid: string): Promise<ReturnType<Nullable<T>>>

    updateById(uid: string, data: PartialOrComplete<T>): Promise<ReturnType<PartialOrComplete<T>>>

    deleteById(uid: string): Promise<ReturnType<Nullable<T>>>
}

export interface GetByFieldDelimiters {
    fieldName: string
    fieldFinder: string
    limit: number
}

export interface GetAllDelimiters {
    limit?: number
    startAfter?: string
    filters?: Array<Record<"field" | "value", string>>
}

interface SetOptions<Input, Output> {
    time: number;
    unit?: TimeValue; // puede ser plural, singular, abreviado, etc.
    onExpire?: (value: Input) => Output;
}

export interface Cache {
    /** Versión 1: segundos + función opcional */
    set<Input, Output>(
        key: string,
        value: Input,
        seconds: number,
        onExpire?: (value: Input) => Output
    ): Promise<"OK">

    /** Versión 2: objeto SetOptions (time + unit + onExpire) */
    set<Input, Output>(
        key: string,
        value: Input,
        options: SetOptions<Input, Output>
    ): Promise<"OK">

    /** Versión 3: parámetros nombrados en un único objeto */
    set<Input, Output>(params: {
        key: string,
        value: Input,
        time: number,
        unit?: TimeValue,
        onExpire?: (value: Input) => Output
    }): Promise<"OK">

    get<T>(key: string): Promise<T | null>;

    del(...keys: Array<string>): Promise<number>
}

export interface Success<T> {
    success: true
    data: T
}

export interface Error<T> {
    success: false
    error: any
}

export type ReturnType<T> = Success<T> | Error<T>

export type Validator<Input, Output> = (data: unknown) => Promise<SafeParseReturnType<Input, Output>>;
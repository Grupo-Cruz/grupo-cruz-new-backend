import { SafeParseReturnType, z } from "zod";
import { Module } from "../index.d";

const ModuleSchema = z.object({
    name: z.string({ required_error: "El nombre del módulo es requerido" }),
    description: z.string().optional(),
    image: z.string().optional(),
    relativeImage: z.string().optional(),
    country: z.string().optional(),
    employees: z.array(z.object({
        id: z.string(),
        idWithCode: z.string()
    })).default([])}
);

export async function validateModule(data: unknown) {
    return ModuleSchema.safeParseAsync(data) as Promise<SafeParseReturnType<any, Module>>;
}

export async function validatePartialModule(data: unknown) {
    return ModuleSchema.partial().safeParseAsync(data) as Promise<SafeParseReturnType<any, Partial<Module>>>;
}
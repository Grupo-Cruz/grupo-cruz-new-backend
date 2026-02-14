import { SafeParseReturnType, z } from "zod";
import { Country } from "../index.d";

const CountrySchema = z.object({
    name: z.string({ required_error: "El nombre del país es requerido" }),
    modules: z.array(z.string()).default([])
});

export async function validateCountry(data: unknown) {
    return CountrySchema.safeParseAsync(data) as Promise<SafeParseReturnType<any, Country>>;
}

export async function validatePartialCountry(data: unknown) {
    return CountrySchema.partial().safeParseAsync(data) as Promise<SafeParseReturnType<any, Partial<Country>>>;
}
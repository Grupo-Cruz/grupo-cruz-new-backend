import { SafeParseReturnType, z } from "zod";
import { User } from "../index.d";

export const RegisterSchema = z.object({
    name: z.string({ description: "El nombre es necesario" }),
    email: z.string({ required_error: "El email es requerido" }).email(),
    password: z.string({ required_error: "La contraseña es requerida" }),
    permissions: z.enum(["Admin", "Gerente", "Colaborador", "Empleado", "Socio", "Usuario", "admin", "gerente", "colaborador", "empleado", "socio", "usuario", "ADMIN", "GERENTE", "COLABORADOR", "EMPLEADO", "SOCIO", "USUARIO"], { message: `EL permiso no se encuentra dentro de los permitidos: "Admin", "Gerente", "Colaborador", "Empleado", "Socio", "Usuario"`, description: "Permiso no identificado" }).default("Usuario"),
    photo: z.string().optional(),
    relativePhoto: z.string().optional()
});

export async function validateRegisterData(data: unknown) {
    return RegisterSchema.safeParseAsync(data) as Promise<SafeParseReturnType<any, User & { password: string }>>;
}
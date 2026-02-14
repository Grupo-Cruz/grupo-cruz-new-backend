import { SafeParseReturnType, z } from "zod";
import { User } from "../index.d";

export const UserSchema = z.object({
    uid: z.string().optional(),
    name: z.string({ description: "El nombre es necesario" }),
    email: z.string({ description: "El correo es necesario" }).email({ message: "El correo ingresado debe ser válido" }),
    permissions: z.enum(["Admin", "Gerente", "Colaborador", "Empleado", "Socio", "Usuario", 
        "admin", "gerente", "colaborador", "empleado", "socio", "usuario", 
        "ADMIN", "GERENTE", "COLABORADOR", "EMPLEADO", "SOCIO", "USUARIO"], 
        { message: `EL permiso no se encuentra dentro de los permitidos: "Admin", "Gerente", "Colaborador", "Empleado", "Socio", "Usuario"`, 
            description: "Permiso no identificado" }).default("Usuario"),
    photo: z.string().optional(),
    relativePhoto: z.string().optional(),
    emailVerifiedNotified: z.boolean().default(false)
});

export async function validateUser(data: unknown) {
    return UserSchema.safeParseAsync(data) as Promise<SafeParseReturnType<any, User>>;
}

export async function validatePartialUser(data: unknown) {
    return UserSchema.partial().safeParseAsync(data) as Promise<SafeParseReturnType<any, Partial<User>>>;
}
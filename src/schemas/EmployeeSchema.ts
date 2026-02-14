import { z, SafeParseReturnType } from "zod";
import { Employee } from "../index.d";

const BaseEmployee = z.object({
    schedule: z.preprocess((val, ctx) => {
        if (Array.isArray(val)) return val;

        if (typeof val === 'string') {
            try {
                return JSON.parse(val);
            } catch (err) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "El campo 'schedule' no es un JSON válido"
                });
                return z.NEVER;
            }
        }

        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Formato inválido para 'schedule'"
        });
        return z.NEVER;
    }, 
    z.array(
        z.object({
            dayName: z.string(),
            startHour: z.string().optional(),
            endHour: z.string().optional()
        })
    )),
    role: z.string(),
    modules: z.preprocess((val, ctx) => {
        if (Array.isArray(val)) return val;

        if (typeof val === 'string') {
            try {
                return JSON.parse(val);
            } catch (err) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "El campo 'modules' no es un Array válido"
                });
                return z.NEVER;
            }
        }

        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Formato inválido para 'modules'"
        });
        return z.NEVER;
    }, z.array(z.string())).default([]),
    code: z.string(),
    photo: z.string().optional(),
    semanalSalary: z.preprocess(val => {
        if (typeof val === 'string') {
            const parsed = parseFloat(val);
            return isNaN(parsed) ? undefined : parsed;
        }

        return val;
    }, z.number().min(0, { message: "El salario debe ser mayor o igual a 0" })),
    active: z.preprocess(val => {
        if (typeof val === "string") {
            if (val === "true") return true;
            if (val === "false") return false;
        }
        return val;
    }, z.boolean()).optional(),
    imss: z.preprocess(val => {
        if (typeof val === "string") {
            if (val === "true") return true;
            if (val === "false") return false;
        }
        return val;
    }, z.boolean()).optional()
});

// 🟢 Usuario existente
const ExistingUserEmployee = BaseEmployee.extend({
    id: z.string(),
    name: z.string().optional(),
    email: z.string().email({ message: "Correo inválido" }).optional(),
    permissions: z.string().optional()
});

// 🔵 Usuario nuevo con correo
const NewUserEmployee = BaseEmployee.extend({
    name: z.string({ required_error: "Nombre obligatorio" }),
    email: z.string({ required_error: "Correo obligatorio" }).email({ message: "Correo inválido" }),
    password: z.string({ required_error: "Contraseña obligatoria" }),
    permissions: z.string()
});

// 🟠 Usuario nuevo anónimo (sin correo)
const NewAnonymousUser = BaseEmployee.extend({
    name: z.string({ required_error: "Nombre obligatorio" }),
    permissions: z.string()
});

// 🔁 Unión de ambos casos
const EmployeeSchema = z.union([ExistingUserEmployee, NewUserEmployee, NewAnonymousUser]);

// ⚠️ Para crear esquema parcial, se hace así manualmente:
const PartialEmployeeSchema = z.union([
    ExistingUserEmployee.partial(),
    NewUserEmployee.partial(),
    NewAnonymousUser.partial()
]);

// ✅ Funciones de validación
export async function validateEmployee(data: unknown) {
    return EmployeeSchema.safeParseAsync(data) as Promise<SafeParseReturnType<any, Employee>>;
}

export async function validatePartialEmployee(data: unknown) {
    return PartialEmployeeSchema.safeParseAsync(data) as Promise<SafeParseReturnType<any, Partial<Employee>>>;
}

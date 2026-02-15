import { z } from "zod";

export const CommentEmail = z.object({
    subject: z.string({ required_error: "El asunto es necesario" }),
    name: z.string({ required_error: "El nombre es necesario" }),
    to: z.string({ required_error: "El correo es necesario" }).email(),
    comment: z.string({ required_error: "El comentario es requerido" }),
});

export async function validateCommentEmail(data: unknown) {
    return CommentEmail.safeParseAsync(data);
}
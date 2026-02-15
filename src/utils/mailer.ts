import * as api from "../config/api";
import nodemailer from "nodemailer";

const supervisorEmail = api.SUPERVISOR_EMAIL;
const logo = api.LINK_LOGO;
const user = api.MAIL_USER;
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user,
        pass: api.MAIL_PASS
    }
});

export async function sendCommentEmail({ to, name, subject, comment }: Record<string, string>) {
    const userMailOptions = {
        from: `"Grupo Cruz" <${user}>`,
        to,
        subject: "Hemos recibido tu comentario - Grupo Cruz",
        html: `
            <div style="font-family: 'Segoe UI', sans-serif; background-color: #f2f6fc; padding: 30px;">
                <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    <div style="padding: 30px; text-align: center;">
                        <img src="${logo}" alt="Grupo Cruz Logo" style="width: 100px; margin-bottom: 20px;" />
                        <h2 style="color: #2b6cb0;">¡Gracias por tu mensaje, ${name}!</h2>
                        <p style="color: #4a5568; font-size: 16px; margin: 20px 0;">
                            Hemos recibido tu comentario correctamente. Agradecemos que te hayas tomado el tiempo de contactarnos.
                        </p>
                        <div style="background-color: #edf2f7; border-left: 4px solid #2b6cb0; padding: 15px; margin: 20px 0; text-align: left;">
                            <strong style="color: #2b6cb0;">Tu asunto:</strong>
                            <p style="color: #4a5568; margin-top: 8px;">${subject}</p>
                            <strong style="color: #2b6cb0;">Tu mensaje:</strong>
                            <p style="color: #4a5568; margin-top: 8px;">${comment}</p>
                        </div>
                        <p style="color: #718096; font-size: 14px;">
                            Nos pondremos en contacto contigo pronto si es necesario.
                        </p>
                    </div>
                    <div style="background-color: #edf2f7; padding: 15px; text-align: center; font-size: 12px; color: #a0aec0;">
                        © ${new Date().getFullYear()} Grupo Cruz S.A. de C.V.
                    </div>
                </div>
            </div>
        `
    };

    const adminMailOptions = {
        from: `"Grupo Cruz" <${user}>`,
        to: supervisorEmail,
        subject: `Hemos recibido un comentario de: ${name}, con correo: ${to}`,
                html: `
            <div style="font-family: 'Segoe UI', sans-serif; background-color: #f2f6fc; padding: 30px;">
                <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    <div style="padding: 30px; text-align: center;">
                        <img src="${logo}" alt="Grupo Cruz Logo" style="width: 100px; margin-bottom: 20px;" />
                        <h2 style="color: #2b6cb0;">¡${name} ha enviado un comentario!</h2>
                        <p style="color: #4a5568; font-size: 16px; margin: 20px 0;">
                            Hemos recibido un comentario del siguiente correo: ${to}.
                        </p>
                        <div style="background-color: #edf2f7; border-left: 4px solid #2b6cb0; padding: 15px; margin: 20px 0; text-align: left;">
                            <strong style="color: #2b6cb0;">El asunto:</strong>
                            <p style="color: #4a5568; margin-top: 8px;">${subject}</p>
                            <strong style="color: #2b6cb0;">El mensaje:</strong>
                            <p style="color: #4a5568; margin-top: 8px;">${comment}</p>
                        </div>
                        <p style="color: #718096; font-size: 14px;">
                            Contactar al cliente en caso de ser necesario.
                        </p>
                    </div>
                    <div style="background-color: #edf2f7; padding: 15px; text-align: center; font-size: 12px; color: #a0aec0;">
                        © ${new Date().getFullYear()} Grupo Cruz S.A. de C.V.
                    </div>
                </div>
            </div>
        `
    };

    return Promise.all([transporter.sendMail(userMailOptions), transporter.sendMail(adminMailOptions)]);
}

export async function sendEmail(to: string, subject: string, html: string) {
    const mailOptions = {
        from: `"Grupo Cruz" <${user}>`,
        to,
        subject,
        html
    };

    return transporter.sendMail(mailOptions);
}

export async function sendPasswordResetEmail(to: string, link: string) {
    return sendEmail(to, "Restablece tu contraseña", 
        `
            <div style="font-family: 'Segoe UI', sans-serif; background-color: #f2f6fc; padding: 30px;">
                <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    <div style="padding: 30px; text-align: center;">
                        <img src="${logo}" alt="Grupo Cruz Logo" style="width: 100px; margin-bottom: 20px;" />
                        <h2 style="color: #2b6cb0;">¿Olvidaste tu contraseña?</h2>
                        <p style="color: #4a5568; font-size: 16px; margin: 20px 0;">Puedes restablecerla haciendo clic en el siguiente botón:</p>
                        <a href="${link}" style="display: inline-block; margin-top: 20px; background-color: #2b6cb0; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Cambiar contraseña</a>
                        <p style="color: #4a5568; font-size: 14px; margin-top: 30px;">Este enlace expira en una hora</p>
                        <p style="color: #718096; font-size: 14px; margin-top: 30px;">
                            Si no pediste el cambio de contraseña, puedes ignorar este mensaje.
                        </p>
                    </div>
                    <div style="background-color: #edf2f7; padding: 15px; text-align: center; font-size: 12px; color: #a0aec0;">
                        © ${new Date().getFullYear()} Grupo Cruz S.A. de C.V.
                    </div>
                </div>
            </div>
        `
    );
}

export async function sendVerificationEmail(to: string, verificationLink: string) {
    return sendEmail(to, "Verifica tu correo electrónico - Grupo Cruz", 
        `
            <div style="font-family: 'Segoe UI', sans-serif; background-color: #f2f6fc; padding: 30px;">
                <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    <div style="padding: 30px; text-align: center;">
                        <img src="${logo}" alt="Grupo Cruz Logo" style="width: 100px; margin-bottom: 20px;" />
                        <h2 style="color: #2b6cb0;">Verificación de correo electrónico</h2>
                        <p style="color: #4a5568; font-size: 16px; margin: 20px 0;">
                            Gracias por registrarte en <strong>Grupo Cruz</strong>.
                            Para continuar, verifica tu correo haciendo clic en el botón:
                        </p>
                        <a href="${verificationLink}" style="display: inline-block; margin-top: 20px; background-color: #2b6cb0; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                            Verificar correo
                        </a>
                        <p style="color: #718096; font-size: 14px; margin-top: 30px;">
                            Si no te registraste, puedes ignorar este mensaje.
                        </p>
                    </div>
                    <div style="background-color: #edf2f7; padding: 15px; text-align: center; font-size: 12px; color: #a0aec0;">
                        © ${new Date().getFullYear()} Grupo Cruz S.A. de C.V. Todos los derechos reservados.
                    </div>
                </div>
            </div>
        `
    );
}

export async function sendEmailVerifiedConfirmation(to: string) {
    return sendEmail(to, "Correo verificado exitosamente", 
        `
            <div style="font-family: 'Segoe UI', sans-serif; background-color: #f2f6fc; padding: 30px;">
                <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    <div style="padding: 30px; text-align: center;">
                        <img src="${logo}" alt="Grupo Cruz Logo" style="width: 100px; margin-bottom: 20px;" />
                        <h2 style="color: #2b6cb0;">¡Gracias por verificar tu correo!</h2>
                        <p style="color: #4a5568; font-size: 16px; margin: 20px 0;">
                            Tu cuenta en <strong>Grupo Cruz</strong> ahora está completamente activa.
                        </p>
                        <p style="color: #718096; font-size: 14px; margin-top: 30px;">
                            Puedes iniciar sesión y comenzar a usar todos los servicios disponibles.
                        </p>
                    </div>
                    <div style="background-color: #edf2f7; padding: 15px; text-align: center; font-size: 12px; color: #a0aec0;">
                        © ${new Date().getFullYear()} Grupo Cruz S.A. de C.V.
                    </div>
                </div>
            </div>
        `
    );
}

export async function sendSuspiciousActivityEmail(to: string, info: { 
    ip?: string ,
    userAgent?: string,
    timestamp?: string
}) {
    const { ip = "Desconocida", userAgent = "Desconocido", timestamp = new Date().toISOString() } = info;
    return sendEmail(to, "Hemos detectado una actividad sospechosa", 
        `
            <div style="font-family: 'Segoe UI', sans-serif; background-color: #f2f6fc; padding: 30px;">
                <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    <div style="padding: 30px; text-align: center;">
                        <img src="${logo}" alt="Grupo Cruz Logo" style="width: 100px; margin-bottom: 20px;" />
                        <h2 style="color: #2b6cb0;">Actividad sospechosa</h2>
                        <p style="color: #4a5568; font-size: 16px; margin: 20px 0;">
                            Detectamos varios intentos fallidos de registro desde tu correo o dirección IP.
                        </p>

                        <p style="color: #4a5568; font-size: 16px; margin: 20px 0;">Si no fuiste tú, ignora este mensaje. De lo contrario, por seguridad, te sugerimos esperar unos minutos antes de volver a intentarlo.</p>

                        <p style="color: #2b6cb0; font-size: 16px; margin: 20px 0;"><strong>Detalles técnicos:</strong></p>

                        <ul>
                            <li style="color: #4a5568; font-size: 16px; margin: 20px 0;"><strong>IP:</strong> ${ip}</li>
                            <li style="color: #4a5568; font-size: 16px; margin: 20px 0;"><strong>Dispositivo:</strong> ${userAgent}</li>
                            <li style="color: #4a5568; font-size: 16px; margin: 20px 0;"><strong>Fecha:</strong> ${new Date(timestamp).toLocaleString("es-MX")}</li>
                        </ul>

                        <p style="color: #4a5568; font-size: 16px; margin: 20px 0;">Si esto continúa, considera contactarnos.</p>
                    </div>
                    <div style="background-color: #edf2f7; padding: 15px; text-align: center; font-size: 12px; color: #a0aec0;">
                        © ${new Date().getFullYear()} Grupo Cruz S.A. de C.V. Todos los derechos reservados.
                    </div>
                </div>
            </div>
        `
    );
}
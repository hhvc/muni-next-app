// functions/src/attendance/generateAttendanceQr.ts

import { onCall, HttpsError } from "firebase-functions/v2/https";
import crypto from "crypto";
import { signAttendance, getBucket, ATTENDANCE_SECRET } from "./attendance.crypto";
// Importante: No necesitas admin.appCheck() para validar aquí si usas el objeto req correctamente

interface GenerateQrData {
    pointCode: string;
}

function getNonce(pointCode: string, bucket: number, secret: string) {
    return crypto
        .createHmac("sha256", secret)
        .update(`nonce|${pointCode}|${bucket}`)
        .digest("hex")
        .substring(0, 12);
}

export const generateAttendanceQr = onCall(
    {
        secrets: [ATTENDANCE_SECRET],
        enforceAppCheck: true
    },
    async (req) => {
        // ======================
        // 1. APP CHECK VERIFICATION
        // ======================

        // En v2, si el token es válido, req.app ya viene poblado.
        // Si estamos en producción y NO hay token, rechazamos.
        if (!req.app && process.env.FUNCTIONS_EMULATOR !== "true") {
            throw new HttpsError(
                "failed-precondition",
                "La solicitud no tiene un token de App Check válido."
            );
        }

        // ======================
        // 2. AUTHENTICATION
        // ======================

        if (!req.auth) {
            throw new HttpsError("unauthenticated", "Debes iniciar sesión para generar el QR");
        }

        const secret = ATTENDANCE_SECRET.value();
        if (!secret) {
            throw new HttpsError("internal", "Secret de seguridad no configurado en el servidor");
        }

        const { pointCode } = req.data as GenerateQrData;

        if (!pointCode) {
            throw new HttpsError("invalid-argument", "El código de punto (pointCode) es requerido");
        }

        // ======================
        // 3. GENERATE QR TOKEN
        // ======================

        const now = Date.now();
        const bucket = getBucket(now);

        const nonce = getNonce(pointCode, bucket, secret);
        const signature = signAttendance(pointCode, bucket, nonce, secret);

        const token = `CHECKIN|${pointCode}|${bucket}|${nonce}|${signature}`;

        return {
            token,
            generatedAt: new Date(now).toISOString(),
            expiresInSeconds: 15,
            nextRefreshInMs: 15000 - (now % 15000),
        };
    }
);
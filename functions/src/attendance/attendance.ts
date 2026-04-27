import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import crypto from "crypto";

interface ValidateAttendanceData {
    token: string;
    lat: number;
    lng: number;
    accuracy?: number;
}

interface GenerateQrData {
    pointCode: string;
}

const SECRET = process.env.ATTENDANCE_SECRET || "cambiar-urgente";

// ======================================================
// HELPERS
// ======================================================

function minuteString(date: Date) {
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(date.getUTCDate()).padStart(2, "0");
    const hh = String(date.getUTCHours()).padStart(2, "0");
    const mi = String(date.getUTCMinutes()).padStart(2, "0");

    return `${yyyy}${mm}${dd}${hh}${mi}`;
}

function sign(pointCode: string, minute: string) {
    return crypto
        .createHmac("sha256", SECRET)
        .update(`${pointCode}|${minute}`)
        .digest("hex")
        .substring(0, 16);
}

function buildToken(pointCode: string, minute: string) {
    const hash = sign(pointCode, minute);
    return `CHECKIN|${pointCode}|${minute}|${hash}`;
}

function distanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
) {
    const R = 6371000;

    const toRad = (n: number) => (n * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;

    return 2 * R * Math.asin(Math.sqrt(a));
}

// ======================================================
// GENERAR QR OFICIAL (SERVIDOR)
// ======================================================

export const generateAttendanceQr = functions.https.onCall(
    async (request: functions.https.CallableRequest<GenerateQrData>) => {
        if (!request.auth) {
            throw new functions.https.HttpsError(
                "unauthenticated",
                "Debes iniciar sesión"
            );
        }

        const { pointCode } = request.data;

        if (!pointCode) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Punto requerido"
            );
        }

        const now = new Date();
        const minute = minuteString(now);

        const token = buildToken(pointCode, minute);

        return {
            token,
            generatedAt: now.toISOString(),
            expiresInSeconds: 60,
        };
    }
);

// ======================================================
// VALIDAR ASISTENCIA
// ======================================================

export const validateAttendance = functions.https.onCall(
    async (request: functions.https.CallableRequest<ValidateAttendanceData>) => {
        try {
            if (!request.auth) {
                throw new functions.https.HttpsError(
                    "unauthenticated",
                    "Debes iniciar sesión"
                );
            }

            const uid = request.auth.uid;

            const { token, lat, lng, accuracy } = request.data;

            if (!token || lat == null || lng == null) {
                throw new functions.https.HttpsError(
                    "invalid-argument",
                    "Datos incompletos"
                );
            }

            const parts = token.split("|");

            if (parts.length !== 4 || parts[0] !== "CHECKIN") {
                throw new functions.https.HttpsError(
                    "permission-denied",
                    "QR inválido"
                );
            }

            const pointCode = parts[1];
            const minute = parts[2];
            const hash = parts[3];

            const expectedHash = sign(pointCode, minute);

            if (hash !== expectedHash) {
                throw new functions.https.HttpsError(
                    "permission-denied",
                    "Firma inválida"
                );
            }

            // tolerancia profesional: minuto actual + 2 previos
            const now = new Date();

            const validMinutes = [];

            for (let i = 0; i <= 5; i++) {
                validMinutes.push(
                    minuteString(
                        new Date(now.getTime() - i * 60000)
                    )
                );
            }

            if (!validMinutes.includes(minute)) {
                throw new functions.https.HttpsError(
                    "permission-denied",
                    "QR vencido"
                );
            }

            const db = new admin.firestore.Firestore({
                databaseId: "munidb",
            });

            // buscar punto
            const pointSnap = await db
                .collection("attendance_points")
                .where("codigo", "==", pointCode)
                .where("activo", "==", true)
                .limit(1)
                .get();

            if (pointSnap.empty) {
                throw new functions.https.HttpsError(
                    "permission-denied",
                    "Punto inválido"
                );
            }

            const point = pointSnap.docs[0];
            const pointData = point.data();

            const meters = distanceMeters(
                lat,
                lng,
                pointData.lat,
                pointData.lng
            );

            if (meters > pointData.radio) {
                throw new functions.https.HttpsError(
                    "permission-denied",
                    "Fuera del perímetro permitido"
                );
            }

            // anti duplicado diario inmediato
            const recentSnap = await db
                .collection("attendance_logs")
                .where("uid", "==", uid)
                .orderBy("timestamp", "desc")
                .limit(1)
                .get();

            if (!recentSnap.empty) {
                const last = recentSnap.docs[0].data();

                if (last.tipo === "ingreso") {
                    throw new functions.https.HttpsError(
                        "already-exists",
                        "Ya registraste ingreso"
                    );
                }
            }

            const userSnap = await db.collection("users").doc(uid).get();
            const userData = userSnap.data();

            await db.collection("attendance_logs").add({
                uid,
                nombre: userData?.displayName || "",
                email: userData?.email || "",
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                tipo: "ingreso",
                metodo: "qr",
                puntoId: point.id,
                puntoNombre: pointData.nombre,
                pointCode,
                lat,
                lng,
                accuracy: accuracy || null,
                distancia: Math.round(meters),
                validado: true,
            });

            return {
                success: true,
                message: "Ingreso registrado",
                punto: pointData.nombre,
            };
        } catch (error) {
            functions.logger.error(error);

            if (error instanceof functions.https.HttpsError) {
                throw error;
            }

            throw new functions.https.HttpsError(
                "internal",
                "Error interno"
            );
        }
    }
);
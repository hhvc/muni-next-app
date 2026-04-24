import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import crypto from "crypto";

interface ValidateAttendanceData {
    token: string;
    lat: number;
    lng: number;
    accuracy?: number;
}

const SECRET = process.env.ATTENDANCE_SECRET || "cambiar-urgente";
const BRANCH_ID = "central";

/* Córdoba ejemplo */
const OFFICE_LAT = -31.4201;
const OFFICE_LNG = -64.1888;
const MAX_DISTANCE_METERS = 150;

function minuteString(date: Date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");

    return `${yyyy}${mm}${dd}${hh}${mi}`;
}

function sign(branchId: string, minute: string) {
    return crypto
        .createHmac("sha256", SECRET)
        .update(`${branchId}|${minute}`)
        .digest("hex")
        .substring(0, 16);
}

function buildToken(branchId: string, minute: string) {
    const hash = sign(branchId, minute);
    return `CHECKIN|${branchId}|${minute}|${hash}`;
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

            const db = new admin.firestore.Firestore({
                databaseId: "munidb",
            });

            /* TOKEN minuto actual o anterior */
            const now = new Date();
            const currentMinute = minuteString(now);

            const prev = new Date(now.getTime() - 60000);
            const prevMinute = minuteString(prev);

            const validTokens = [
                buildToken(BRANCH_ID, currentMinute),
                buildToken(BRANCH_ID, prevMinute),
            ];

            if (!validTokens.includes(token)) {
                throw new functions.https.HttpsError(
                    "permission-denied",
                    "QR vencido o inválido"
                );
            }

            /* GPS */
            const meters = distanceMeters(
                lat,
                lng,
                OFFICE_LAT,
                OFFICE_LNG
            );

            if (meters > MAX_DISTANCE_METERS) {
                throw new functions.https.HttpsError(
                    "permission-denied",
                    "Fuera del perímetro permitido"
                );
            }

            /* Anti doble ingreso */
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
                lat,
                lng,
                accuracy: accuracy || null,
                distancia: Math.round(meters),
                branchId: BRANCH_ID,
                validado: true,
            });

            return {
                success: true,
                message: "Ingreso registrado",
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
// functions/src/attendance/validateAttendance.ts

import * as admin from "firebase-admin";
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { signAttendance, ATTENDANCE_SECRET, getBucket } from "./attendance.crypto";
import { getPoint } from "./attendance.points.cache";

// ======================
// REPLAY CACHE (MEMORIA)
// ======================
const replayCache = new Map<string, number>();
const REPLAY_TTL = 30 * 1000;

function isReplay(key: string) {
    const now = Date.now();
    const last = replayCache.get(key);
    if (last && now - last < REPLAY_TTL) return true;
    replayCache.set(key, now);
    return false;
}

// ======================
// DISTANCIA GEO
// ======================
function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
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

// ======================
// MAIN FUNCTION
// ======================
export const validateAttendance = onCall(
    {
        secrets: [ATTENDANCE_SECRET],
        enforceAppCheck: true
    },
    async (req) => {
        const db = getFirestore("munidb");

        // ======================
        // 1. APP CHECK VERIFICATION (CORREGIDO)
        // ======================

        // En v2, si req.app es undefined, el token no es válido o no existe.
        // Solo bloqueamos si NO estamos en el emulador.
        const isVerified = !!req.app;
        const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";

        if (!isVerified && !isEmulator) {
            throw new HttpsError(
                "failed-precondition",
                "App Check verification failed. Request non from a verified app."
            );
        }

        // ======================
        // 2. AUTHENTICATION
        // ======================
        if (!req.auth) {
            throw new HttpsError("unauthenticated", "No autenticado");
        }

        const secret = ATTENDANCE_SECRET.value();
        if (!secret) {
            throw new HttpsError("failed-precondition", "Secret no disponible");
        }

        const uid = req.auth.uid;
        const { token, lat, lng } = req.data;

        if (!token || lat == null || lng == null) {
            throw new HttpsError("invalid-argument", "Datos incompletos");
        }

        // ======================
        // PARSE & VALIDATE TOKEN
        // ======================
        const parts = token.split("|");
        if (parts.length !== 5 || parts[0] !== "CHECKIN") {
            throw new HttpsError("permission-denied", "QR inválido");
        }

        const [, pointCode, bucketStr, nonce, signature] = parts;
        const bucket = Number(bucketStr);

        const expected = signAttendance(pointCode, bucket, nonce, secret);
        if (expected !== signature) {
            throw new HttpsError("permission-denied", "Firma inválida");
        }

        const nowBucket = getBucket(Date.now());
        if (Math.abs(nowBucket - bucket) > 1) {
            throw new HttpsError("permission-denied", "QR vencido");
        }

        const replayKey = `${pointCode}_${bucket}_${nonce}`;
        if (isReplay(replayKey)) {
            throw new HttpsError("already-exists", "QR ya usado");
        }

        // ======================
        // GEO & POINT VALIDATION
        // ======================
        const point = await getPoint(pointCode);
        if (!point) {
            throw new HttpsError("permission-denied", "Punto inválido");
        }

        const meters = distanceMeters(lat, lng, point.lat, point.lng);
        if (meters > point.radio) {
            throw new HttpsError("permission-denied", "Estás fuera del radio permitido");
        }

        // ======================
        // TRANSACTION
        // ======================
        const today = new Date().toISOString().split("T")[0];

        try {
            await db.runTransaction(async (transaction) => {
                const uniqueRef = db.collection("attendance_uniqueness").doc(`${uid}_${today}`);
                const uniqueDoc = await transaction.get(uniqueRef);

                if (uniqueDoc.exists) {
                    throw new HttpsError("already-exists", "Ya marcaste asistencia hoy");
                }

                transaction.set(uniqueRef, {
                    uid,
                    day: today,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    appCheckVerified: isVerified
                });

                const logRef = db.collection("attendance_logs").doc();
                transaction.set(logRef, {
                    uid,
                    pointCode,
                    lat,
                    lng,
                    method: "qr",
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    day: today,
                    bucket,
                    appCheckVerified: isVerified
                });
            });
        } catch (error) {
            if (error instanceof HttpsError) throw error;
            console.error("Error en transacción:", error);
            throw new HttpsError("internal", "Error al registrar asistencia");
        }

        return { success: true };
    }
);
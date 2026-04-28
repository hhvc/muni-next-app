import crypto from "crypto";
import { defineSecret } from "firebase-functions/params";

export const ATTENDANCE_SECRET = defineSecret("ATTENDANCE_SECRET");

export function signAttendance(
    pointCode: string,
    bucket: number,
    nonce: string,
    secret: string
): string {
    return crypto
        .createHmac("sha256", secret)
        .update(`${pointCode}|${bucket}|${nonce}`)
        .digest("hex")
        .substring(0, 16);
}

export function getBucket(serverTimeMs: number) {
    return Math.floor(serverTimeMs / 15000);
}
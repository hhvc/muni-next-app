// functions/src/attendance/attendance.points.cache.ts
import { getFirestore } from 'firebase-admin/firestore';

// ✅ CORREGIDO: Apuntar a 'munidb' para encontrar los puntos de asistencia
const db = getFirestore("munidb");

const cache = new Map<string, { data: any; ts: number }>();
const TTL = 10 * 60 * 1000; // 10 min

/**
 * Obtiene un punto de asistencia por su código, utilizando una caché en memoria
 * para reducir las lecturas a Firestore.
 */
export async function getPoint(code: string) {
    const now = Date.now();
    const cached = cache.get(code);

    // Validar si existe en caché y si no ha expirado
    if (cached && now - cached.ts < TTL) {
        return cached.data;
    }

    try {
        const snap = await db
            .collection("attendance_points")
            .where("codigo", "==", code)
            .where("activo", "==", true)
            .limit(1)
            .get();

        if (snap.empty) {
            // Si no existe, podemos cachear el null por un tiempo corto 
            // para evitar ataques de fuerza bruta al DB, pero por ahora retornamos null.
            return null;
        }

        const data = snap.docs[0].data();

        // Actualizar caché
        cache.set(code, {
            data,
            ts: now
        });

        return data;
    } catch (error) {
        console.error(`Error recuperando el punto ${code} desde Firestore:`, error);
        // Si hay un error de red y tenemos datos viejos en caché, 
        // podrías optar por devolverlos como fallback, pero aquí retornamos null por seguridad.
        return null;
    }
}
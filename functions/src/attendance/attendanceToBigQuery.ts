// functions/src/attendance/attendanceToBigQuery.ts

import { BigQuery } from "@google-cloud/bigquery";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

const bigquery = new BigQuery();

const DATASET = "attendance";
const TABLE = "logs";

export const attendanceToBigQuery = onDocumentCreated(
    {
        document: "attendance_logs/{id}",
        database: "munidb" // ✅ CRÍTICO: Especificar la base de datos para que el trigger se active
    },
    async (event) => {
        try {
            const data = event.data?.data();

            if (!data) {
                logger.warn("AttendanceToBigQuery: No data found in event");
                return;
            }

            // ✅ MANEJO DE FECHA
            let createdAt: Date;

            if (data.createdAt) {
                // Si es un Timestamp de Firestore
                if (typeof data.createdAt.toDate === 'function') {
                    createdAt = data.createdAt.toDate();
                }
                // Si ya es un Date
                else if (data.createdAt instanceof Date) {
                    createdAt = data.createdAt;
                }
                // Si es un string o número
                else {
                    createdAt = new Date(data.createdAt);
                }
            } else {
                createdAt = new Date();
            }

            // PREPARAR LOS DATOS PARA BIGQUERY
            const row = {
                uid: data.uid,
                pointCode: data.pointCode,
                lat: data.lat,
                lng: data.lng,
                method: data.method || "qr",
                bucket: data.bucket,
                day: data.day,
                createdAt: createdAt.toISOString(), // ✅ BigQuery prefiere strings ISO para timestamps
                // Campos adicionales de auditoría
                appCheckPresent: data.appCheckPresent || false,
                appCheckVerified: data.appCheckVerified || false
            };

            // INSERTAR EN BIGQUERY
            await bigquery
                .dataset(DATASET)
                .table(TABLE)
                .insert([row]);

            logger.info("AttendanceToBigQuery: Successfully inserted record", {
                uid: data.uid,
                pointCode: data.pointCode,
                day: data.day
            });

        } catch (error) {
            // ✅ Manejo de errores independiente
            logger.error("AttendanceToBigQuery: Error inserting into BigQuery", {
                error: error instanceof Error ? error.message : "Unknown error",
                eventId: event.id,
                documentPath: event.data?.ref?.path
            });
        }
    }
);
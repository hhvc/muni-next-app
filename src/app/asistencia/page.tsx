"use client";

import { useAuth } from "@/components/AuthProvider";
import { ATTENDANCE_ALLOWED_ROLES } from "@/lib/attendanceRoles";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/firebase/clientApp";

export default function AsistenciaPage() {
    const { user, userRoles } = useAuth();

    const [allowed, setAllowed] = useState(false);
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);

    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const processingRef = useRef(false);

    useEffect(() => {
        if (!userRoles) return;

        const ok = userRoles.some((r) =>
            ATTENDANCE_ALLOWED_ROLES.includes(r)
        );

        setAllowed(ok);
    }, [userRoles]);

    const iniciarScanner = () => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: 250,
            },
            false
        );

        scanner.render(
            async (decodedText) => {
                if (processingRef.current) return;

                processingRef.current = true;
                setLoading(true);

                try {
                    await scanner.clear();

                    setStatus("QR detectado. Obteniendo ubicación...");

                    navigator.geolocation.getCurrentPosition(
                        async (position) => {
                            try {
                                const payload = {
                                    token: decodedText,
                                    lat: position.coords.latitude,
                                    lng: position.coords.longitude,
                                    accuracy: position.coords.accuracy,
                                };

                                setStatus("Validando asistencia...");

                                const functions = getFunctions(app, "us-central1");
                                const fn = httpsCallable(
                                    functions,
                                    "validateAttendance"
                                );

                                const result = await fn(payload);

                                console.log(result.data);

                                setStatus("✅ Asistencia registrada correctamente");
                            } catch (error: any) {
                                console.error(error);

                                setStatus(
                                    `❌ ${error?.message || "No se pudo validar asistencia"}`
                                );
                            } finally {
                                setLoading(false);
                            }
                        },
                        () => {
                            setStatus("❌ No se pudo obtener ubicación GPS.");
                            setLoading(false);
                        },
                        {
                            enableHighAccuracy: true,
                            timeout: 10000,
                        }
                    );
                } catch (error) {
                    console.error(error);
                    setStatus("❌ Error al leer QR.");
                    setLoading(false);
                }
            },
            () => { }
        );

        scannerRef.current = scanner;
    };

    useEffect(() => {
        if (!allowed) return;

        iniciarScanner();

        return () => {
            scannerRef.current?.clear().catch(() => { });
        };
    }, [allowed]);

    if (!user) return null;

    if (!allowed) {
        return (
            <div className="container py-5">
                <div className="alert alert-danger">
                    Sin permisos para asistencia.
                </div>
            </div>
        );
    }

    return (
        <div className="container py-4">
            <h2>Registrar Asistencia</h2>

            <p>Escaneá el QR de recepción.</p>

            <div id="reader" />

            {loading && (
                <div className="alert alert-warning mt-4">
                    Procesando...
                </div>
            )}

            {status && (
                <div className="alert alert-info mt-4">
                    {status}
                </div>
            )}

            {!loading && (
                <button
                    className="btn btn-primary mt-3"
                    onClick={() => {
                        processingRef.current = false;
                        setStatus("");
                        iniciarScanner();
                    }}
                >
                    Escanear nuevamente
                </button>
            )}
        </div>
    );
}
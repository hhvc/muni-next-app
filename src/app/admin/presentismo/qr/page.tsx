// src/app/admin/presentismo/qr/page.tsx

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import useFirebase from "@/hooks/useFirebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { QR_ADMIN_ROLES } from "@/lib/attendanceRoles";

import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/firebase/clientApp";

import QRCode from "qrcode";

interface Punto {
    id: string;
    nombre: string;
    codigo: string;
    activo: boolean;
}

export default function QRPage() {
    const {
        userRoles,
        loadingUserStatus: authLoading,
    } = useAuth(); const { db, isInitialized } = useFirebase();

    const [puntos, setPuntos] = useState<Punto[]>([]);
    const [selected, setSelected] = useState("");

    const [qr, setQr] = useState("");
    const [loadingPoints, setLoadingPoints] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [msg, setMsg] = useState("");

    // ======================================================
    // PERMISOS
    // ======================================================

    const allowed = useMemo(() => {
        if (!userRoles || userRoles.length === 0) return false;

        return userRoles.some((role: string) =>
            QR_ADMIN_ROLES.includes(role)
        );
    }, [userRoles]);

    // ======================================================
    // CARGAR PUNTOS
    // ======================================================

    const cargarPuntos = useCallback(async () => {
        if (!db) return;

        try {
            setLoadingPoints(true);
            setMsg("");

            const q = query(
                collection(db, "attendance_points"),
                where("activo", "==", true)
            );

            const snap = await getDocs(q);

            const arr: Punto[] = snap.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as Omit<Punto, "id">),
            }));

            setPuntos(arr);

            if (arr.length > 0) {
                setSelected((prev) =>
                    prev && arr.some((p) => p.codigo === prev)
                        ? prev
                        : arr[0].codigo
                );
            } else {
                setSelected("");
            }
        } catch (error) {
            console.error(error);
            setMsg("❌ No se pudieron cargar puntos.");
        } finally {
            setLoadingPoints(false);
        }
    }, [db]);

    useEffect(() => {
        if (!allowed) return;
        if (!isInitialized) return;
        if (!db) return;

        cargarPuntos();
    }, [allowed, isInitialized, db, cargarPuntos]);

    // ======================================================
    // GENERAR QR DESDE SERVIDOR (CALLABLE)
    // ======================================================

    const generarQR = useCallback(async () => {
        if (!selected) return;

        try {
            setGenerating(true);
            setMsg("");

            const functions = getFunctions(app, "us-central1");

            const fn = httpsCallable<
                { pointCode: string },
                {
                    token: string;
                    generatedAt: string;
                    expiresInSeconds: number;
                }
            >(functions, "generateAttendanceQr");

            const result = await fn({
                pointCode: selected,
            });

            const token = result.data.token;

            const dataUrl = await QRCode.toDataURL(token, {
                width: 320,
                margin: 2,
            });

            setQr(dataUrl);
        } catch (error: any) {
            console.error(error);

            if (error?.code === "functions/unauthenticated") {
                setMsg("❌ Debes iniciar sesión.");
            } else if (error?.code === "functions/permission-denied") {
                setMsg("❌ Sin permisos.");
            } else {
                setMsg("❌ No se pudo generar QR.");
            }

            setQr("");
        } finally {
            setGenerating(false);
        }
    }, [selected]);

    // ======================================================
    // AUTO REFRESH PROFESIONAL
    // ======================================================

    useEffect(() => {
        if (!selected) return;
        if (!allowed) return;

        generarQR();

        const interval = setInterval(() => {
            generarQR();
        }, 45000);

        return () => clearInterval(interval);
    }, [selected, allowed, generarQR]);

    // ======================================================
    // RENDER
    // ======================================================

    if (authLoading) {
        return (
            <div className="container py-5 text-center">
                <p>Cargando permisos...</p>
            </div>
        );
    }

    if (!allowed) {
        return (
            <div className="container py-5">
                <div className="alert alert-danger">
                    Sin permisos.
                </div>
            </div>
        );
    }

    return (
        <div className="container py-5 text-center">
            <h2 className="mb-4">QR Presentismo</h2>

            {loadingPoints ? (
                <p>Cargando puntos...</p>
            ) : puntos.length === 0 ? (
                <div className="alert alert-warning">
                    No hay puntos activos creados.
                </div>
            ) : (
                <>
                    <div
                        className="mx-auto mb-4"
                        style={{ maxWidth: "420px" }}
                    >
                        <label className="form-label fw-semibold">
                            Punto de asistencia
                        </label>

                        <select
                            className="form-select"
                            value={selected}
                            onChange={(e) =>
                                setSelected(e.target.value)
                            }
                        >
                            {puntos.map((p) => (
                                <option
                                    key={p.id}
                                    value={p.codigo}
                                >
                                    {p.nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="mb-3">
                        {generating ? (
                            <p>Generando QR...</p>
                        ) : qr ? (
                            <img
                                src={qr}
                                width="320"
                                height="320"
                                alt="QR Presentismo"
                                className="img-fluid border rounded p-2 bg-white"
                            />
                        ) : (
                            <p>Sin QR generado.</p>
                        )}
                    </div>

                    <p className="text-muted mb-3">
                        Se actualiza automáticamente cada 45 segundos
                    </p>

                    <button
                        className="btn btn-outline-primary"
                        onClick={generarQR}
                        disabled={generating}
                    >
                        {generating
                            ? "Actualizando..."
                            : "Actualizar ahora"}
                    </button>
                </>
            )}

            {msg && (
                <div className="alert alert-info mt-4">
                    {msg}
                </div>
            )}
        </div>
    );
}
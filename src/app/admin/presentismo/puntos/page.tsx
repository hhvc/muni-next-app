// src/app/admin/presentismo/puntos/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import useFirebase from "@/hooks/useFirebase";

import {
    collection,
    addDoc,
    serverTimestamp,
    getDocs,
    query,
    orderBy,
    deleteDoc,
    doc,
} from "firebase/firestore";

const ALLOWED_ROLES = ["root", "admin", "data", "rrhh", "manager"];

interface Punto {
    id: string;
    nombre: string;
    codigo: string;
    radio: number;
    activo: boolean;
    createdAt?: any;
}

export default function PresentismoPuntosPage() {
    const { userRoles } = useAuth();
    const { db, isInitialized } = useFirebase();

    const [allowed, setAllowed] = useState(false);

    const [nombre, setNombre] = useState("");
    const [codigo, setCodigo] = useState("");
    const [radio, setRadio] = useState(120);

    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");

    const [puntos, setPuntos] = useState<Punto[]>([]);
    const [loadingList, setLoadingList] = useState(true);

    useEffect(() => {
        if (!userRoles) return;

        const ok = userRoles.some((r) => ALLOWED_ROLES.includes(r));
        setAllowed(ok);
    }, [userRoles]);

    const canUse = useMemo(() => {
        return allowed && isInitialized && db;
    }, [allowed, isInitialized, db]);

    async function cargarPuntos() {
        if (!db) return;

        try {
            setLoadingList(true);

            const q = query(
                collection(db, "attendance_points"),
                orderBy("createdAt", "desc")
            );

            const snap = await getDocs(q);

            const data: Punto[] = snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as Omit<Punto, "id">),
            }));

            setPuntos(data);
        } catch (error) {
            console.error(error);
            setMsg("❌ No se pudo cargar la lista.");
        } finally {
            setLoadingList(false);
        }
    }

    useEffect(() => {
        if (!canUse) return;
        cargarPuntos();
    }, [canUse]);

    async function guardarPunto() {
        if (!db) return;

        if (!nombre.trim()) {
            setMsg("⚠️ Ingresá un nombre.");
            return;
        }

        if (!codigo.trim()) {
            setMsg("⚠️ Ingresá un código.");
            return;
        }

        try {
            setLoading(true);
            setMsg("");

            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    try {
                        await addDoc(collection(db, "attendance_points"), {
                            nombre: nombre.trim(),
                            codigo: codigo.trim().toLowerCase(),
                            radio: Number(radio),
                            activo: true,
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                            accuracy: pos.coords.accuracy,
                            createdAt: serverTimestamp(),
                        });

                        setNombre("");
                        setCodigo("");
                        setRadio(120);

                        setMsg("✅ Punto creado correctamente.");
                        cargarPuntos();
                    } catch (error) {
                        console.error(error);
                        setMsg("❌ Error guardando punto.");
                    } finally {
                        setLoading(false);
                    }
                },
                () => {
                    setLoading(false);
                    setMsg("❌ No se pudo obtener ubicación.");
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                }
            );
        } catch (error) {
            console.error(error);
            setLoading(false);
            setMsg("❌ Error general.");
        }
    }

    async function eliminarPunto(id: string) {
        if (!db) return;

        const ok = confirm("¿Eliminar este punto?");
        if (!ok) return;

        try {
            await deleteDoc(doc(db, "attendance_points", id));
            setMsg("🗑️ Punto eliminado.");
            cargarPuntos();
        } catch (error) {
            console.error(error);
            setMsg("❌ No se pudo eliminar.");
        }
    }

    if (!allowed) {
        return (
            <div className="container py-5">
                <div className="alert alert-danger">
                    Sin permisos para administrar puntos de presentismo.
                </div>
            </div>
        );
    }

    return (
        <div className="container py-4">
            <h2 className="mb-4">Puntos de Presentismo</h2>

            <div className="card shadow-sm mb-4">
                <div className="card-body">
                    <h5 className="mb-3">Nuevo Punto</h5>

                    <div className="row g-3">
                        <div className="col-md-5">
                            <label className="form-label">Nombre</label>
                            <input
                                className="form-control"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                placeholder="Ej: Palacio 6° Piso"
                            />
                        </div>

                        <div className="col-md-4">
                            <label className="form-label">Código</label>
                            <input
                                className="form-control"
                                value={codigo}
                                onChange={(e) => setCodigo(e.target.value)}
                                placeholder="Ej: central"
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Radio (mts)</label>
                            <input
                                type="number"
                                className="form-control"
                                value={radio}
                                onChange={(e) => setRadio(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <button
                        className="btn btn-primary mt-4"
                        onClick={guardarPunto}
                        disabled={loading}
                    >
                        {loading ? "Guardando..." : "Guardar con mi ubicación actual"}
                    </button>
                </div>
            </div>

            {msg && <div className="alert alert-info">{msg}</div>}

            <div className="card shadow-sm">
                <div className="card-body">
                    <h5 className="mb-3">Puntos Registrados</h5>

                    {loadingList ? (
                        <p>Cargando...</p>
                    ) : puntos.length === 0 ? (
                        <p>No hay puntos creados.</p>
                    ) : (
                        <div className="table-responsive">
                            <table className="table align-middle">
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Código</th>
                                        <th>Radio</th>
                                        <th>Estado</th>
                                        <th></th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {puntos.map((p) => (
                                        <tr key={p.id}>
                                            <td>{p.nombre}</td>
                                            <td>{p.codigo}</td>
                                            <td>{p.radio} m</td>
                                            <td>{p.activo ? "Activo" : "Inactivo"}</td>
                                            <td className="text-end">
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => eliminarPunto(p.id)}
                                                >
                                                    Eliminar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
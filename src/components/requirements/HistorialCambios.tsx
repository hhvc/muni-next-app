// src/components/requirements/HistorialCambios.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase/clientApp";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";

interface HistorialCambiosProps {
  requirementId: string;
}

interface HistorialItem {
  id: string;
  usuario: {
    uid: string;
    email: string;
    nombre: string;
  };
  timestamp: any;
  cambios: Record<string, any>;
}

interface UserData {
  uid: string;
  displayName: string;
  email: string;
}

// Función para formatear fecha
const formatDate = (date: any) => {
  if (!date) return "N/A";
  const dateObj = date?.toDate?.() || new Date(date);
  return dateObj.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function HistorialCambios({
  requirementId,
}: HistorialCambiosProps) {
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserData>>({});
  const [loading, setLoading] = useState(true);

  // Cargar historial de cambios
  useEffect(() => {
    const loadHistorial = async () => {
      if (!requirementId) return;

      try {
        // Cargar todos los usuarios primero
        const usersRef = collection(db, "users");
        const usersSnapshot = await getDocs(usersRef);
        const usersData: Record<string, UserData> = {};

        usersSnapshot.forEach((doc) => {
          const data = doc.data();
          usersData[doc.id] = {
            uid: doc.id,
            displayName: data.displayName || data.email || "Usuario",
            email: data.email || "",
          };
        });

        setUsersMap(usersData);

        // Cargar historial
        const historialRef = collection(db, "requirementHistory");
        const q = query(
          historialRef,
          where("requirementId", "==", requirementId),
          orderBy("timestamp", "desc")
        );
        const querySnapshot = await getDocs(q);
        const historialData: HistorialItem[] = [];

        querySnapshot.forEach((doc) => {
          historialData.push({ id: doc.id, ...doc.data() } as HistorialItem);
        });

        setHistorial(historialData);
      } catch (err) {
        console.error("Error al cargar historial:", err);
      } finally {
        setLoading(false);
      }
    };

    loadHistorial();
  }, [requirementId]);

  // Función para formatear el valor de un cambio
  const formatChangeValue = (key: string, value: any): string => {
    if (key === "asignadoA") {
      // Formatear asignadoA para mostrar solo nombres
      if (Array.isArray(value)) {
        return value
          .map((item) => {
            if (typeof item === "object" && item !== null) {
              // Si el item tiene usuarioNombre, usarlo
              if (item.usuarioNombre) {
                return item.usuarioNombre;
              }
              // Si tiene usuarioId, buscar en usersMap
              if (item.usuarioId && usersMap[item.usuarioId]) {
                return usersMap[item.usuarioId].displayName;
              }
              // Si es un objeto con displayName (de la colección users)
              if (item.displayName) {
                return item.displayName;
              }
            }
            return String(item);
          })
          .join(", ");
      }
      return String(value);
    }
    return String(value);
  };

  if (loading) {
    return (
      <div className="text-center py-3">
        <div className="spinner-border spinner-border-sm" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header bg-secondary text-white">
        <h6 className="mb-0">Historial de Cambios</h6>
      </div>
      <div
        className="card-body"
        style={{ maxHeight: "300px", overflowY: "auto" }}
      >
        {historial.length === 0 ? (
          <p className="text-muted">No hay historial de cambios</p>
        ) : (
          historial.map((item, index) => (
            <div
              key={item.id}
              className={`mb-3 pb-3 ${
                index < historial.length - 1 ? "border-bottom" : ""
              }`}
            >
              <div className="small">
                <div className="d-flex justify-content-between">
                  <strong>{item.usuario?.nombre || "Sistema"}</strong>
                  <span className="text-muted">
                    {item.timestamp ? formatDate(item.timestamp) : "N/A"}
                  </span>
                </div>
                {item.cambios && Object.keys(item.cambios).length > 0 && (
                  <div className="mt-2">
                    {Object.entries(item.cambios).map(
                      ([key, value]: [string, any]) => (
                        <div key={key} className="mt-1">
                          <div className="text-primary fw-semibold">{key}:</div>
                          <div className="ps-2 small">
                            {value.anterior !== undefined && (
                              <div>
                                <span className="text-muted">Anterior:</span>{" "}
                                {formatChangeValue(key, value.anterior)}
                              </div>
                            )}
                            {value.nuevo !== undefined && (
                              <div>
                                <span className="text-success">Nuevo:</span>{" "}
                                {formatChangeValue(key, value.nuevo)}
                              </div>
                            )}
                            {value.accion && (
                              <div>
                                <span className="text-info">Acción:</span>{" "}
                                {String(value.accion)}
                              </div>
                            )}
                            {value.contenido && (
                              <div>
                                <span className="text-info">Contenido:</span>{" "}
                                {String(value.contenido)}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

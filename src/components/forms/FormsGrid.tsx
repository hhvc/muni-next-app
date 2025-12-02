// src/components/forms/FormsGrid.tsx - VERSIÓN CON ORDER CORREGIDO
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/firebase/clientApp";
import { FormMetadata } from "@/types/formTypes";
import FormCard, { FormGrid } from "./FormCard";
import LoadingSpinner from "@/components/LoadingSpinner";

interface FormsGridProps {
  category?: string;
  showInactive?: boolean;
}

export default function FormsGrid({
  category,
  showInactive = false,
}: FormsGridProps) {
  const { user, userRoles } = useAuth();
  const [forms, setForms] = useState<FormMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Función para normalizar allowedRoles (puede ser string, array, null o undefined)
  const normalizeAllowedRoles = useCallback(
    (roles: unknown): string[] | null => {
      if (!roles) return null;

      if (Array.isArray(roles)) {
        // Asegurar que todos los elementos sean strings
        return roles.map((role) => String(role));
      }

      if (typeof roles === "string") {
        // Intentar parsear si es un string JSON
        try {
          const parsed = JSON.parse(roles);
          if (Array.isArray(parsed)) {
            return parsed.map((role) => String(role));
          }
          return [roles]; // Si es un string simple, convertir a array
        } catch {
          return [roles]; // Si no es JSON, convertir a array con un elemento
        }
      }

      return null;
    },
    []
  );

  // Función segura para convertir Firestore Timestamp a Date
  const toSafeDate = useCallback((timestamp: unknown): Date | null => {
    if (!timestamp) return null;

    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }

    // Si es un objeto con método toDate
    const timestampObj = timestamp as { toDate?: () => Date };
    if (typeof timestampObj.toDate === "function") {
      return timestampObj.toDate();
    }

    // Si tiene propiedades seconds/nanoseconds (Firestore Timestamp en formato objeto)
    const timestampWithSeconds = timestamp as {
      seconds?: number;
      nanoseconds?: number;
    };
    if (timestampWithSeconds.seconds) {
      return new Date(timestampWithSeconds.seconds * 1000);
    }

    return null;
  }, []);

  // Función para obtener el orden (con valor por defecto 0)
  const getOrderValue = useCallback((order: number | undefined): number => {
    return order || 0;
  }, []);

  useEffect(() => {
    const fetchForms = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const formsRef = collection(db, "forms");
        const querySnapshot = await getDocs(formsRef);
        const formsData: FormMetadata[] = [];

        const currentUserRoles = userRoles || [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();

          // DEBUG: Ver qué datos se están obteniendo
          console.log(`📄 Formulario ${doc.id}:`, data);

          // Normalizar allowedRoles
          const normalizedAllowedRoles = normalizeAllowedRoles(
            data.allowedRoles
          );

          const form: FormMetadata = {
            id: doc.id,
            title: data.title || "Sin título",
            description: data.description || null,
            formUrl: data.formUrl || "#",
            iconUrl: data.iconUrl || null,
            category: data.category || null,
            tags: Array.isArray(data.tags) ? data.tags : null,
            createdBy: data.createdBy || user.uid,
            createdAt: toSafeDate(data.createdAt),
            updatedAt: toSafeDate(data.updatedAt),
            isActive: data.isActive !== false, // Por defecto true si no está definido
            allowedRoles: normalizedAllowedRoles,
            order: data.order,
          };

          // Filtrar por estado activo (si showInactive es false)
          if (!showInactive && !form.isActive) {
            return;
          }

          // Filtrar por categoría en el cliente
          if (category && form.category !== category) {
            return;
          }

          // Filtrar por roles permitidos - MANERA SEGURA
          const shouldShowForm = () => {
            // Si no tiene restricciones de roles, mostrar a todos
            if (!form.allowedRoles || form.allowedRoles.length === 0) {
              return true;
            }

            // Si el usuario tiene alguno de los roles permitidos
            if (currentUserRoles.length > 0) {
              return currentUserRoles.some((role: string) => {
                return form.allowedRoles?.includes(role) || false;
              });
            }

            return false;
          };

          if (shouldShowForm()) {
            formsData.push(form);
          }
        });

        // Ordenar por order y title en el cliente - USANDO getOrderValue
        formsData.sort((a, b) => {
          // Primero por orden (con valor por defecto 0 si es undefined)
          const orderA = getOrderValue(a.order);
          const orderB = getOrderValue(b.order);

          if (orderA !== orderB) {
            return orderA - orderB;
          }

          // Luego por título
          const titleA = a.title || "";
          const titleB = b.title || "";
          return titleA.localeCompare(titleB);
        });

        console.log(`✅ Formularios filtrados: ${formsData.length}`, formsData);
        setForms(formsData);
        setError("");
      } catch (err) {
        console.error("❌ Error al cargar formularios:", err);

        // Verificar si es un error de Firebase
        const firebaseError = err as { code?: string; message?: string };

        if (firebaseError.code === "failed-precondition") {
          setError(
            "Error de configuración en la base de datos. Contacta al administrador."
          );
        } else {
          const errorMessage = firebaseError.message || "Error desconocido";
          setError(`No se pudieron cargar los formularios: ${errorMessage}`);
        }
      } finally {
        setLoading(false);
      }
    };

    // Agregar un pequeño delay para evitar llamadas excesivas
    const timer = setTimeout(fetchForms, 100);
    return () => clearTimeout(timer);
  }, [
    user,
    userRoles,
    category,
    showInactive,
    normalizeAllowedRoles,
    toSafeDate,
    getOrderValue,
  ]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center my-5">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-warning" role="alert">
        <h5 className="alert-heading">⚠️ Error</h5>
        <p className="mb-0">{error}</p>
        <button
          className="btn btn-sm btn-outline-primary mt-2"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (forms.length === 0) {
    return (
      <div className="text-center py-5">
        <div className="mb-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            fill="#6c757d"
            className="bi bi-file-earmark"
            viewBox="0 0 16 16"
          >
            <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z" />
          </svg>
        </div>
        <h4 className="text-muted">No hay formularios disponibles</h4>
        <p className="text-muted">
          {category
            ? `No se encontraron formularios en la categoría "${category}"`
            : "Aún no se han registrado formularios."}
        </p>
        <button
          className="btn btn-outline-primary"
          onClick={() => window.location.reload()}
        >
          Recargar
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3>Formularios Disponibles</h3>
          {category && (
            <span className="badge bg-primary">Categoría: {category}</span>
          )}
        </div>
        <small className="text-muted">{forms.length} formulario(s)</small>
      </div>

      <FormGrid cols={3}>
        {forms.map((form) => (
          <FormCard
            key={form.id}
            title={form.title}
            description={form.description || undefined}
            formUrl={form.formUrl}
            iconUrl={form.iconUrl || undefined}
            target="_blank"
            badge={form.category || undefined}
            badgeColor="info"
          />
        ))}
      </FormGrid>
    </div>
  );
}

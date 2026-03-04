// src/components/forms/FormsGrid.tsx - VERSIÓN CORREGIDA
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  collection,
  getDocs,
  Timestamp,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/firebase/clientApp";
import { FormMetadata } from "@/types/formTypes";
import FormCard from "./FormCard";
import LoadingSpinner from "@/components/LoadingSpinner";

interface FormsGridProps {
  // Props para uso normal (carga desde Firebase)
  category?: string;
  showInactive?: boolean;

  // Props para uso desde FormsManager
  forms?: FormMetadata[];
  initialShowAll?: boolean; // Control inicial de si mostrar todos
}

export default function FormsGrid({
  category,
  showInactive = false,
  forms: externalForms,
  initialShowAll = false,
}: FormsGridProps) {
  const { user, userRoles } = useAuth();
  const [forms, setForms] = useState<FormMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(initialShowAll); // Estado interno para controlar la vista

  // Determinar si estamos usando formularios externos o cargando desde Firebase
  const isUsingExternalForms = externalForms !== undefined;

  /* ---------------- Helpers ---------------- */

  const normalizeAllowedRoles = useCallback(
    (roles: unknown): string[] | null => {
      if (!roles) return null;

      if (Array.isArray(roles)) {
        return roles.map(String);
      }

      if (typeof roles === "string") {
        try {
          const parsed = JSON.parse(roles);
          if (Array.isArray(parsed)) {
            return parsed.map(String);
          }
          return [roles];
        } catch {
          return [roles];
        }
      }

      return null;
    },
    [],
  );

  const toSafeDate = useCallback((timestamp: unknown): Date | null => {
    if (!timestamp) return null;

    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }

    const obj = timestamp as { toDate?: () => Date; seconds?: number };
    if (typeof obj.toDate === "function") {
      return obj.toDate();
    }

    if (obj.seconds) {
      return new Date(obj.seconds * 1000);
    }

    return null;
  }, []);

  const getOrderValue = useCallback((order?: number) => order ?? 0, []);

  /* ---------------- Data fetch ---------------- */

  // Cargar formularios desde Firebase si no se proporcionan externamente
  useEffect(() => {
    // Si se proporcionan formularios externos, usarlos directamente
    if (isUsingExternalForms) {
      setForms(externalForms || []);
      setLoading(false);
      // Cuando recibimos formularios externos, reiniciamos showAll al valor inicial
      setShowAll(initialShowAll);
      return;
    }

    const fetchForms = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const formsRef = collection(db, "forms");

        const q = category
          ? query(formsRef, where("category", "==", category))
          : formsRef;

        const snapshot = await getDocs(q);

        const currentRoles = userRoles ?? [];
        const formsData: FormMetadata[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();

          const allowedRoles = normalizeAllowedRoles(data.allowedRoles);

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
            isActive: data.isActive !== false,
            allowedRoles,
            order: data.order,
          };

          if (!showInactive && !form.isActive) return;

          const hasRoleAccess =
            !allowedRoles ||
            allowedRoles.length === 0 ||
            currentRoles.some((r) => allowedRoles.includes(r));

          if (hasRoleAccess) {
            formsData.push(form);
          }
        });

        formsData.sort((a, b) => {
          const orderDiff = getOrderValue(a.order) - getOrderValue(b.order);
          if (orderDiff !== 0) return orderDiff;
          return (a.title || "").localeCompare(b.title || "");
        });

        setForms(formsData);
        setError("");
      } catch (err) {
        console.error("❌ Error al cargar formularios:", err);
        setError("No se pudieron cargar los formularios.");
      } finally {
        setLoading(false);
      }
    };

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
    isUsingExternalForms,
    externalForms,
    initialShowAll,
  ]);

  /* ---------------- Filtrado de formularios para vista ---------------- */

  // Determinar qué formularios mostrar
  const displayForms = showAll ? forms : forms.slice(0, 6);

  /* ---------------- UI states ---------------- */

  if (loading) {
    return (
      <div className="d-flex justify-content-center my-5">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-warning">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (forms.length === 0) {
    return (
      <div className="text-center py-5">
        <h4 className="dashboard-title">No hay formularios disponibles</h4>
        <p className="dashboard-subtitle">
          {category
            ? `No se encontraron formularios en la categoría "${category}"`
            : "Aún no se han registrado formularios."}
        </p>
      </div>
    );
  }

  /* ---------------- Grid ---------------- */

  return (
    <section>
      {!isUsingExternalForms && (
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="dashboard-title mb-0">Formularios disponibles</h3>
          <small className="text-muted">{forms.length} formulario(s)</small>
        </div>
      )}

      <div
        className="forms-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.5rem",
          alignItems: "stretch",
        }}
      >
        {displayForms.map((form) => (
          <FormCard
            key={form.id}
            title={form.title}
            description={form.description || undefined}
            formUrl={form.formUrl}
            iconUrl={form.iconUrl || undefined}
            target="_blank"
            badge={form.category || undefined}
            badgeColor="primary"
            showInactiveBadge={!form.isActive}
          />
        ))}
      </div>

      {/* Botón para mostrar más/menos formularios */}
      {forms.length > 6 && (
        <div className="text-center mt-4">
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll
              ? "Ver menos"
              : `Ver todos los formularios (${forms.length})`}
          </button>
        </div>
      )}
    </section>
  );
}

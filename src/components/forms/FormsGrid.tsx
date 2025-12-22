"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/firebase/clientApp";
import { FormMetadata } from "@/types/formTypes";
import FormCard from "./FormCard";
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
    []
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

  useEffect(() => {
    const fetchForms = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const snapshot = await getDocs(collection(db, "forms"));
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
          if (category && form.category !== category) return;

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
  ]);

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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="dashboard-title mb-0">Formularios disponibles</h3>
        <small className="text-muted">{forms.length} formulario(s)</small>
      </div>

      <div
        className="forms-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.5rem",
          alignItems: "stretch",
        }}
      >
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
      </div>
    </section>
  );
}

/* src/components/document-templates/TemplateGrid.tsx */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/firebase/clientApp";
import { TemplateMetadata } from "@/types/templateTypes";
import TemplateCard from "./TemplateCard";
import LoadingSpinner from "@/components/LoadingSpinner";

interface TemplateGridProps {
  category?: string;
  showInactive?: boolean;
  limit?: number;
}

/**
 * Contenedor responsivo para grilla de tarjetas de plantillas (document-templates)
 * - Mobile: 1 columna
 * - Desktop común: 2 columnas
 * - Pantallas XL: 3 columnas
 * - Pantallas XXL: 4 columnas (opcional)
 */
function TemplateGridContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="row g-4 row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xl-4">
      {children}
    </div>
  );
}

export default function TemplateGrid({
  category,
  showInactive = false,
  limit = 0,
}: TemplateGridProps) {
  const { user, userRoles } = useAuth();
  const [templates, setTemplates] = useState<TemplateMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /**
   * Normaliza allowedRoles desde Firestore
   */
  const normalizeAllowedRoles = useCallback(
    (roles: unknown): string[] | null => {
      if (!roles) return null;

      if (Array.isArray(roles)) {
        return roles.map((role) => String(role));
      }

      if (typeof roles === "string") {
        try {
          const parsed = JSON.parse(roles);
          if (Array.isArray(parsed)) {
            return parsed.map((role) => String(role));
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

  /**
   * Convierte distintos formatos de timestamp a Date
   */
  const toSafeDate = useCallback((timestamp: unknown): Date | null => {
    if (!timestamp) return null;

    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }

    const timestampObj = timestamp as { toDate?: () => Date };
    if (typeof timestampObj.toDate === "function") {
      return timestampObj.toDate();
    }

    const timestampWithSeconds = timestamp as {
      seconds?: number;
      nanoseconds?: number;
    };
    if (timestampWithSeconds.seconds) {
      return new Date(timestampWithSeconds.seconds * 1000);
    }

    return null;
  }, []);

  /**
   * Obtiene el valor de orden o un valor por defecto
   */
  const getOrderValue = useCallback((order: number | undefined): number => {
    return order || 0;
  }, []);

  /**
   * Verifica si el usuario tiene acceso a la plantilla (template)
   */
  const checkTemplateAccess = useCallback(
    (allowedRoles: string[] | null | undefined): boolean => {
      const currentUserRoles = userRoles || [];

      // Si no hay restricciones de rol, todos tienen acceso
      if (!allowedRoles || allowedRoles.length === 0) {
        return true;
      }

      // Si el usuario tiene roles, verificar si alguno coincide
      if (currentUserRoles.length > 0) {
        return currentUserRoles.some((role: string) =>
          allowedRoles.includes(role)
        );
      }

      // Usuario sin roles definidos
      return false;
    },
    [userRoles]
  );

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const templatesRef = collection(db, "templates");
        const querySnapshot = await getDocs(templatesRef);
        const templatesData: TemplateMetadata[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();

          const normalizedAllowedRoles = normalizeAllowedRoles(
            data.allowedRoles
          );

          const template: TemplateMetadata = {
            id: doc.id,
            title: data.title || "Sin título",
            description: data.description || undefined,
            templateUrl: data.templateUrl || "#",
            thumbnailUrl: data.thumbnailUrl || undefined,
            creator: data.creator || "Desconocido",
            createdBy: data.createdBy || user.uid,
            createdAt: toSafeDate(data.createdAt) || new Date(),
            updatedAt: toSafeDate(data.updatedAt) || undefined,
            fileType: data.fileType || undefined,
            fileSize: data.fileSize || undefined,
            category: data.category || undefined,
            tags: Array.isArray(data.tags) ? data.tags : undefined,
            isActive: data.isActive !== false,
            allowedRoles: normalizedAllowedRoles || undefined,
            downloadCount: data.downloadCount || 0,
            order: data.order || 0,
          };

          // Filtrar por estado activo/inactivo
          if (!showInactive && !template.isActive) return;

          // Filtrar por categoría si se especifica
          if (category && template.category !== category) return;

          // Verificar permisos de acceso
          if (!checkTemplateAccess(template.allowedRoles)) return;

          templatesData.push(template);
        });

        // Ordenar plantillas (templates)
        templatesData.sort((a, b) => {
          // Primero por orden configurado
          const orderA = getOrderValue(a.order);
          const orderB = getOrderValue(b.order);
          if (orderA !== orderB) return orderA - orderB;

          // Luego por fecha de creación (más recientes primero)
          const dateA = a.createdAt?.getTime() || 0;
          const dateB = b.createdAt?.getTime() || 0;
          return dateB - dateA;
        });

        // Aplicar límite si se especifica
        const finalTemplates =
          limit > 0 ? templatesData.slice(0, limit) : templatesData;

        setTemplates(finalTemplates);
        setError("");
      } catch (err) {
        console.error("❌ Error al cargar plantillas:", err);

        const firebaseError = err as { code?: string; message?: string };

        if (firebaseError.code === "failed-precondition") {
          setError(
            "Error de configuración en la base de datos. Contacta al administrador."
          );
        } else {
          setError(
            `No se pudieron cargar las plantillas: ${
              firebaseError.message || "Error desconocido"
            }`
          );
        }
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchTemplates, 100);
    return () => clearTimeout(timer);
  }, [
    user,
    userRoles,
    category,
    showInactive,
    limit,
    normalizeAllowedRoles,
    toSafeDate,
    getOrderValue,
    checkTemplateAccess,
  ]);

  /* =========================
     Estados de carga / error
     ========================= */

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
        <h5 className="alert-heading">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Error
        </h5>
        <p className="mb-0">{error}</p>
        <button
          className="btn btn-sm btn-outline-secondary mt-2"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-5">
        <i
          className="bi bi-folder-x text-muted"
          style={{ fontSize: "3rem" }}
        ></i>
        <h4 className="mt-3 text-muted">No hay plantillas disponibles</h4>
        <p className="text-muted">
          {category
            ? `No se encontraron plantillas en la categoría "${category}"`
            : "Aún no se han registrado plantillas en el repositorio."}
        </p>
        <button
          className="btn btn-outline-secondary"
          onClick={() => window.location.reload()}
        >
          <i className="bi bi-arrow-clockwise me-2"></i>
          Recargar
        </button>
      </div>
    );
  }

  /* =========================
     Render principal
     ========================= */

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold">
            <i className="bi bi-files me-2"></i>
            Repositorio de Plantillas
          </h3>
          {category && (
            <span className="badge bg-secondary mt-1">
              Categoría: {category}
            </span>
          )}
          {limit > 0 && templates.length === limit && (
            <span className="badge bg-info mt-1 ms-2">
              Mostrando {limit} más recientes
            </span>
          )}
        </div>
        <small className="text-muted">{templates.length} plantilla(s)</small>
      </div>

      <TemplateGridContainer>
        {templates.map((template) => (
          <div className="col" key={template.id}>
            <TemplateCard
              title={template.title}
              description={template.description}
              templateUrl={template.templateUrl}
              thumbnailUrl={template.thumbnailUrl}
              creator={template.creator}
              createdAt={template.createdAt}
              fileType={template.fileType}
              fileSize={template.fileSize}
              badge={template.category}
              badgeColor="secondary"
              target="_blank"
              showThumbnail={true}
            />
          </div>
        ))}
      </TemplateGridContainer>

      {limit > 0 && templates.length === limit && (
        <div className="text-center mt-4">
          <a href="/dashboard/templates" className="btn btn-outline-secondary">
            <i className="bi bi-eye me-2"></i>
            Ver todas las plantillas
          </a>
        </div>
      )}
    </div>
  );
}

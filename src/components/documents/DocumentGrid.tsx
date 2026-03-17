/* src/components/documents/DocumentGrid.tsx */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/firebase/clientApp";
import { DocumentMetadata } from "@/types/documentTypes";
import DocumentCard from "./DocumentCard";
import LoadingSpinner from "@/components/LoadingSpinner";

interface DocumentGridProps {
  category?: string;
  showInactive?: boolean;
  limit?: number;
}

/**
 * Contenedor responsivo para grilla de tarjetas de documentos
 * - Mobile: 1 columna
 * - Desktop común: 2 columnas
 * - Pantallas XL: 3 columnas
 * - Pantallas XXL: 4 columnas (opcional)
 */
function DocumentGridContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="row g-4 row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xl-4">
      {children}
    </div>
  );
}

export default function DocumentGrid({
  category,
  showInactive = false,
  limit = 0,
}: DocumentGridProps) {
  const { user, userRoles } = useAuth();
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
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
    [],
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
   * Verifica si el usuario tiene acceso al documento
   */
  const checkDocumentAccess = useCallback(
    (allowedRoles: string[] | null | undefined): boolean => {
      const currentUserRoles = userRoles || [];

      // Si no hay restricciones de rol, todos tienen acceso
      if (!allowedRoles || allowedRoles.length === 0) {
        return true;
      }

      // Si el usuario tiene roles, verificar si alguno coincide
      if (currentUserRoles.length > 0) {
        return currentUserRoles.some((role: string) =>
          allowedRoles.includes(role),
        );
      }

      // Usuario sin roles definidos
      return false;
    },
    [userRoles],
  );

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const documentsRef = collection(db, "documents");
        const querySnapshot = await getDocs(documentsRef);
        const documentsData: DocumentMetadata[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();

          const normalizedAllowedRoles = normalizeAllowedRoles(
            data.allowedRoles,
          );

          const document: DocumentMetadata = {
            id: doc.id,
            title: data.title || "Sin título",
            description: data.description || undefined,
            documentUrl: data.documentUrl || "#",
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
          if (!showInactive && !document.isActive) return;

          // Filtrar por categoría si se especifica
          if (category && document.category !== category) return;

          // Verificar permisos de acceso
          if (!checkDocumentAccess(document.allowedRoles)) return;

          documentsData.push(document);
        });

        // Ordenar documentos
        documentsData.sort((a, b) => {
          // Primero por orden configurado
          const orderA = getOrderValue(a.order);
          const orderB = getOrderValue(b.order);
          if (orderA !== orderB) return orderA - orderB;

          // Luego por fecha de creación (más recientes primero)
          const dateA = toSafeDate(a.createdAt)?.getTime() || 0;
          const dateB = toSafeDate(b.createdAt)?.getTime() || 0;

          return dateB - dateA;
        });

        // Aplicar límite si se especifica
        const finalDocuments =
          limit > 0 ? documentsData.slice(0, limit) : documentsData;

        setDocuments(finalDocuments);
        setError("");
      } catch (err) {
        console.error("❌ Error al cargar documentos:", err);

        const firebaseError = err as { code?: string; message?: string };

        if (firebaseError.code === "failed-precondition") {
          setError(
            "Error de configuración en la base de datos. Contacta al administrador.",
          );
        } else {
          setError(
            `No se pudieron cargar los documentos: ${
              firebaseError.message || "Error desconocido"
            }`,
          );
        }
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchDocuments, 100);
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
    checkDocumentAccess,
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

  if (documents.length === 0) {
    return (
      <div className="text-center py-5">
        <i
          className="bi bi-folder-x text-muted"
          style={{ fontSize: "3rem" }}
        ></i>
        <h4 className="mt-3 text-muted">No hay documentos disponibles</h4>
        <p className="text-muted">
          {category
            ? `No se encontraron documentos en la categoría "${category}"`
            : "Aún no se han registrado documentos en el repositorio."}
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
            Repositorio de Documentos
          </h3>
          {category && (
            <span className="badge bg-secondary mt-1">
              Categoría: {category}
            </span>
          )}
          {limit > 0 && documents.length === limit && (
            <span className="badge bg-info mt-1 ms-2">
              Mostrando {limit} más recientes
            </span>
          )}
        </div>
        <small className="text-muted">{documents.length} documento(s)</small>
      </div>

      <DocumentGridContainer>
        {documents.map((document) => (
          <div className="col" key={document.id}>
            <DocumentCard
              title={document.title}
              description={document.description}
              documentUrl={document.documentUrl}
              thumbnailUrl={document.thumbnailUrl}
              creator={document.creator}
              createdAt={document.createdAt}
              fileType={document.fileType}
              fileSize={document.fileSize}
              badge={document.category}
              badgeColor="secondary"
              target="_blank"
              showThumbnail={true}
            />
          </div>
        ))}
      </DocumentGridContainer>

      {limit > 0 && documents.length === limit && (
        <div className="text-center mt-4">
          <a href="/dashboard/documents" className="btn btn-outline-secondary">
            <i className="bi bi-eye me-2"></i>
            Ver todos los documentos
          </a>
        </div>
      )}
    </div>
  );
}

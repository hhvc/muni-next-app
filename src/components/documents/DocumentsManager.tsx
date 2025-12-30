/* src/components/documents/DocumentsManager.tsx - VERSIÓN CORREGIDA PARA FILTRAR PDFs */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebase/clientApp";
import { DocumentMetadata } from "../../types/documentTypes";
import DocumentCard from "./DocumentCard";
import DocumentForm from "./DocumentForm";
import LoadingSpinner from "@/components/LoadingSpinner";

type ManagerView = "view" | "create" | "edit";

// Función para obtener icono según tipo de archivo (la misma que en DocumentCard)
const getFileIcon = (fileType?: string) => {
  if (!fileType) return "bi-file-earmark";

  const type = fileType.toLowerCase();

  if (type.includes("pdf")) return "bi-file-pdf";
  if (type.includes("word") || type.includes("doc")) return "bi-file-word";
  if (type.includes("excel") || type.includes("xls")) return "bi-file-excel";
  if (type.includes("powerpoint") || type.includes("ppt")) return "bi-file-ppt";
  if (type.includes("image")) return "bi-file-image";
  if (type.includes("zip") || type.includes("rar")) return "bi-file-zip";
  if (type.includes("text") || type.includes("txt")) return "bi-file-text";

  return "bi-file-earmark";
};

export default function DocumentsManager() {
  const { user, userRoles } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeView, setActiveView] = useState<ManagerView>("view");
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDocument, setSelectedDocument] =
    useState<DocumentMetadata | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null
  );
  const [showAllDocuments, setShowAllDocuments] = useState(false);

  // Verificar permisos
  const canManageDocuments = userRoles?.some((role) =>
    ["admin", "hr", "root", "data"].includes(role)
  );

  const canEditDocuments = userRoles?.some((role) =>
    ["admin", "root"].includes(role)
  );

  // Cargar documentos
  const fetchDocuments = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const docsRef = collection(db, "documents");
      const querySnapshot = await getDocs(docsRef);
      const docsData: DocumentMetadata[] = [];

      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();

        const document: DocumentMetadata = {
          id: docSnapshot.id,
          title: data.title || "Sin título",
          description: data.description || undefined,
          documentUrl: data.documentUrl || "#",
          thumbnailUrl: data.thumbnailUrl || undefined,
          creator: data.creator || "Desconocido",
          createdBy: data.createdBy || user.uid,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || undefined,
          fileType: data.fileType || undefined,
          fileSize: data.fileSize || undefined,
          category: data.category || undefined,
          tags: Array.isArray(data.tags) ? data.tags : undefined,
          isActive: data.isActive !== false,
          allowedRoles: Array.isArray(data.allowedRoles)
            ? data.allowedRoles
            : undefined,
          downloadCount: data.downloadCount || 0,
          order: data.order || 0,
        };

        docsData.push(document);
      });

      // Ordenar por fecha de creación descendente
      docsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setDocuments(docsData);
      setError("");
    } catch (err) {
      console.error("❌ Error al cargar documentos:", err);
      setError(`Error al cargar documentos: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments, refreshKey]);

  // Contar PDFs - FUNCIÓN CORREGIDA
  const countPDFs = useCallback(() => {
    return documents.filter((doc) => {
      if (!doc.fileType) return false;
      // Convertir a minúsculas para hacer la comparación insensible a mayúsculas/minúsculas
      const fileTypeLower = doc.fileType.toLowerCase();
      // Verificar si contiene "pdf" en cualquier parte del string
      return fileTypeLower.includes("pdf") || fileTypeLower === "pdf";
    }).length;
  }, [documents]);

  // Contar documentos por tipo - FUNCIÓN AUXILIAR
  const countByFileType = useCallback(
    (type: string) => {
      return documents.filter((doc) => {
        if (!doc.fileType) return false;
        const fileTypeLower = doc.fileType.toLowerCase();
        const searchType = type.toLowerCase();
        return fileTypeLower.includes(searchType);
      }).length;
    },
    [documents]
  );

  // Manejar éxito en creación/edición
  const handleDocumentCreated = () => {
    setRefreshKey((prev) => prev + 1);
    setActiveView("view");
    setSelectedDocument(null);
    setShowAllDocuments(false);
  };

  // Manejar edición
  const handleEditDocument = (document: DocumentMetadata) => {
    setSelectedDocument(document);
    setActiveView("edit");
  };

  // Cancelar edición
  const handleCancelEdit = () => {
    setSelectedDocument(null);
    setActiveView("view");
  };

  // Manejar eliminación
  const handleDeleteDocument = async (documentId: string) => {
    if (!canEditDocuments || !documentId) {
      setError("No tienes permisos para eliminar documentos");
      return;
    }

    try {
      await deleteDoc(doc(db, "documents", documentId));
      setRefreshKey((prev) => prev + 1);
      setShowDeleteConfirm(null);
      setError("");
    } catch (err) {
      console.error("❌ Error al eliminar documento:", err);
      setError(`Error al eliminar documento: ${(err as Error).message}`);
    }
  };

  // Formatear fecha
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Vista en grid de documentos
  const renderDocumentGrid = () => (
    <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xl-4 g-4">
      {(showAllDocuments ? documents : documents.slice(0, 8))
        .filter((doc) => doc.isActive)
        .map((document) => (
          <div key={document.id} className="col">
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
              badgeColor="info"
              target="_blank"
              showThumbnail={true}
            />
          </div>
        ))}
    </div>
  );

  return (
    <div className="container-fluid">
      {/* Tabs de navegación */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeView === "view" ? "active" : ""}`}
            onClick={() => {
              setActiveView("view");
              setSelectedDocument(null);
              setShowAllDocuments(false);
            }}
          >
            <i className="bi bi-files me-2"></i>
            Ver Documentos
            <span className="badge bg-secondary ms-2">{documents.length}</span>
          </button>
        </li>

        {canManageDocuments && activeView !== "edit" && (
          <li className="nav-item">
            <button
              className={`nav-link ${activeView === "create" ? "active" : ""}`}
              onClick={() => setActiveView("create")}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Nuevo Documento
            </button>
          </li>
        )}

        {activeView === "edit" && selectedDocument && (
          <li className="nav-item">
            <button className="nav-link active" disabled>
              <i className="bi bi-pencil me-2"></i>
              Editando: {selectedDocument.title}
            </button>
          </li>
        )}
      </ul>

      {/* Mensajes de error */}
      {error && (
        <div
          className="alert alert-danger alert-dismissible fade show mb-4"
          role="alert"
        >
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError("")}
          ></button>
        </div>
      )}

      {/* Contenido de los tabs */}
      <div className="tab-content">
        {activeView === "view" && (
          <div key={refreshKey}>
            {loading ? (
              <div className="text-center py-5">
                <LoadingSpinner />
                <p className="mt-3 text-muted">Cargando Documentos...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-5">
                <div className="mb-3">
                  <i
                    className="bi bi-folder text-muted"
                    style={{ fontSize: "4rem" }}
                  ></i>
                </div>
                <h4 className="text-muted">No hay documentos registrados</h4>
                <p className="text-muted mb-4">
                  Sube tu primer documento al repositorio
                </p>
                {canManageDocuments && (
                  <button
                    className="btn btn-info text-white"
                    onClick={() => setActiveView("create")}
                  >
                    <i className="bi bi-upload me-2"></i>
                    Subir Primer Documento
                  </button>
                )}
              </div>
            ) : (
              <div>
                {/* Estadísticas - CORREGIDAS */}
                <div className="row mb-4">
                  <div className="col-md-3">
                    <div className="card border-0 themed-surface">
                      <div className="card-body text-center">
                        <h3 className="mb-0">{documents.length}</h3>
                        <p className="text-muted mb-0">Total</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-0 themed-surface">
                      <div className="card-body text-center">
                        <h3 className="mb-0">
                          {documents.filter((d) => d.isActive).length}
                        </h3>
                        <p className="text-muted mb-0">Activos</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-0 themed-surface">
                      <div className="card-body text-center">
                        <h3 className="mb-0">
                          {
                            Array.from(
                              new Set(
                                documents.map((d) => d.category).filter(Boolean)
                              )
                            ).length
                          }
                        </h3>
                        <p className="text-muted mb-0">Categorías</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-0 themed-surface">
                      <div className="card-body text-center">
                        <h3 className="mb-0">
                          {countPDFs()} {/* Usa la función corregida */}
                        </h3>
                        <p className="text-muted mb-0">PDFs</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Estadísticas adicionales de tipos de archivo */}
                <div className="row mb-4">
                  <div className="col-md-2">
                    <div className="card border-0 bg-light">
                      <div className="card-body text-center">
                        <h5 className="mb-0">{countByFileType("word")}</h5>
                        <p className="text-muted mb-0 small">Word</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card border-0 bg-light">
                      <div className="card-body text-center">
                        <h5 className="mb-0">{countByFileType("excel")}</h5>
                        <p className="text-muted mb-0 small">Excel</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card border-0 bg-light">
                      <div className="card-body text-center">
                        <h5 className="mb-0">
                          {countByFileType("powerpoint")}
                        </h5>
                        <p className="text-muted mb-0 small">PowerPoint</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card border-0 bg-light">
                      <div className="card-body text-center">
                        <h5 className="mb-0">{countByFileType("image")}</h5>
                        <p className="text-muted mb-0 small">Imágenes</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card border-0 bg-light">
                      <div className="card-body text-center">
                        <h5 className="mb-0">{countByFileType("text")}</h5>
                        <p className="text-muted mb-0 small">Texto</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card border-0 bg-light">
                      <div className="card-body text-center">
                        <h5 className="mb-0">{countByFileType("zip")}</h5>
                        <p className="text-muted mb-0 small">Zip</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid de documentos */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">
                      <i className="bi bi-folder2-open me-2"></i>
                      Repositorio de Documentos
                    </h5>
                    {documents.length > 8 && (
                      <button
                        className="btn btn-outline-info btn-sm"
                        onClick={() => setShowAllDocuments(!showAllDocuments)}
                      >
                        {showAllDocuments
                          ? "Ver menos"
                          : `Ver todos (${documents.length})`}
                      </button>
                    )}
                  </div>

                  {renderDocumentGrid()}
                </div>

                {/* Tabla detallada (opcional) */}
                {canEditDocuments && (
                  <div className="card border-0 shadow-sm mt-4">
                    <div className="card-header themed-surface">
                      <h6 className="mb-0">
                        <i className="bi bi-list-ul me-2"></i>
                        Lista Detallada
                      </h6>
                    </div>
                    <div className="card-body p-0">
                      <div className="table-responsive">
                        <table className="table table-hover mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>Documento</th>
                              <th>Tipo</th>
                              <th>Creador</th>
                              <th>Fecha</th>
                              <th>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {documents.map((doc) => (
                              <tr key={doc.id}>
                                <td>
                                  <div className="d-flex align-items-center">
                                    <i
                                      className={`bi ${getFileIcon(
                                        doc.fileType
                                      )} me-2 text-info`}
                                    ></i>
                                    <div>
                                      <strong>{doc.title}</strong>
                                      {doc.description && (
                                        <div className="text-muted small">
                                          {doc.description.substring(0, 60)}...
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span className="badge themed-surface text-dark">
                                    {doc.fileType || "N/A"}
                                  </span>
                                </td>
                                <td>{doc.creator}</td>
                                <td>
                                  <small className="text-muted">
                                    {formatDate(doc.createdAt)}
                                  </small>
                                </td>
                                <td>
                                  <div className="d-flex gap-2">
                                    <a
                                      href={doc.documentUrl}
                                      target="_blank"
                                      className="btn btn-sm btn-outline-primary"
                                      title="Ver documento"
                                    >
                                      <i className="bi bi-eye"></i>
                                    </a>
                                    {canEditDocuments && (
                                      <>
                                        <button
                                          className="btn btn-sm btn-outline-info"
                                          onClick={() =>
                                            handleEditDocument(doc)
                                          }
                                          title="Editar"
                                        >
                                          <i className="bi bi-pencil"></i>
                                        </button>
                                        <button
                                          className="btn btn-sm btn-outline-danger"
                                          onClick={() =>
                                            setShowDeleteConfirm(doc.id)
                                          }
                                          title="Eliminar"
                                        >
                                          <i className="bi bi-trash"></i>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {(activeView === "create" || activeView === "edit") && (
          <div className="row">
            <div className="col-12 col-lg-8">
              <DocumentForm
                onSuccess={handleDocumentCreated}
                documentToEdit={
                  activeView === "edit" ? selectedDocument : undefined
                }
                onCancel={activeView === "edit" ? handleCancelEdit : undefined}
              />
            </div>

            <div className="col-12 col-lg-4">
              <div
                className="card border-0 shadow-sm sticky-top"
                style={{ top: "20px" }}
              >
                <div className="card-body">
                  <h5 className="card-title">
                    <i className="bi bi-lightbulb text-primary me-2"></i>
                    Tips para documentos
                  </h5>
                  <ul className="list-unstyled">
                    <li className="mb-2">
                      <small className="text-muted">
                        1. Asegúrate de que el documento tenga permisos de
                        acceso público
                      </small>
                    </li>
                    <li className="mb-2">
                      <small className="text-muted">
                        2. Usa URLs directas para mejor compatibilidad
                      </small>
                    </li>
                    <li className="mb-2">
                      <small className="text-muted">
                        3. Agrega una imagen miniatura para mejor presentación
                      </small>
                    </li>
                    <li className="mb-2">
                      <small className="text-muted">
                        4. Especifica correctamente el tipo de archivo
                      </small>
                    </li>
                    <li>
                      <small className="text-muted">
                        5. Asigna categorías para organizar tus documentos
                      </small>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

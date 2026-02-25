/* src/components/document-templates/TemplateManager.tsx */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/firebase/clientApp";
import { TemplateMetadata } from "../../types/templateTypes";
import TemplateCard from "./TemplateCard";
import TemplateForm from "./TemplateForm";
import LoadingSpinner from "@/components/LoadingSpinner";
import Image from "next/image";

type ManagerView = "view" | "create" | "edit";

// Función para obtener icono según tipo de archivo (la misma que en TemplateCard)
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

export default function TemplateManager() {
  const { user, userRoles } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeView, setActiveView] = useState<ManagerView>("view");
  const [templates, setTemplates] = useState<TemplateMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateMetadata | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null
  );
  const [showAllTemplates, setShowAllTemplates] = useState(false);

  // Verificar permisos
  const canManageTemplates = userRoles?.some((role) =>
    ["admin", "hr", "root", "data"].includes(role)
  );

  const canEditTemplates = userRoles?.some((role) =>
    ["admin", "root"].includes(role)
  );

  // Cargar plantillas (templates)
  const fetchTemplates = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const docsRef = collection(db, "templates");
      const querySnapshot = await getDocs(docsRef);
      const docsData: TemplateMetadata[] = [];

      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();

        const template: TemplateMetadata = {
          id: docSnapshot.id,
          title: data.title || "Sin título",
          description: data.description || undefined,
          templateUrl: data.templateUrl || "#",
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

        docsData.push(template);
      });

      // Ordenar por fecha de creación descendente
      docsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setTemplates(docsData);
      setError("");
    } catch (err) {
      console.error("❌ Error al cargar plantillas:", err);
      setError(`Error al cargar plantillas: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates, refreshKey]);

  // Contar PDFs - FUNCIÓN CORREGIDA
  const countPDFs = useCallback(() => {
    return templates.filter((doc) => {
      if (!doc.fileType) return false;
      // Convertir a minúsculas para hacer la comparación insensible a mayúsculas/minúsculas
      const fileTypeLower = doc.fileType.toLowerCase();
      // Verificar si contiene "pdf" en cualquier parte del string
      return fileTypeLower.includes("pdf") || fileTypeLower === "pdf";
    }).length;
  }, [templates]);

  // Contar plantillas por tipo - FUNCIÓN AUXILIAR
  const countByFileType = useCallback(
    (type: string) => {
      return templates.filter((doc) => {
        if (!doc.fileType) return false;
        const fileTypeLower = doc.fileType.toLowerCase();
        const searchType = type.toLowerCase();
        return fileTypeLower.includes(searchType);
      }).length;
    },
    [templates]
  );

  // Manejar éxito en creación/edición
  const handleTemplateCreated = () => {
    setRefreshKey((prev) => prev + 1);
    setActiveView("view");
    setSelectedTemplate(null);
    setShowAllTemplates(false);
  };

  // Manejar edición
  const handleEditTemplate = (template: TemplateMetadata) => {
    setSelectedTemplate(template);
    setActiveView("edit");
  };

  // Cancelar edición
  const handleCancelEdit = () => {
    setSelectedTemplate(null);
    setActiveView("view");
  };

  // Manejar activación/desactivación de plantilla
  const handleToggleTemplateStatus = async (template: TemplateMetadata) => {
    if (!canEditTemplates || !template.id) {
      setError("No tienes permisos para editar plantillas");
      return;
    }

    try {
      await updateDoc(doc(db, "templates", template.id), {
        isActive: !template.isActive,
        updatedAt: Timestamp.now(),
      });
      setRefreshKey((prev) => prev + 1);
      setError("");
    } catch (err) {
      console.error("❌ Error al cambiar estado de la plantilla:", err);
      setError(`Error al cambiar estado: ${(err as Error).message}`);
    }
  };

  // Manejar eliminación
  const handleDeleteTemplate = async (templateId: string) => {
    if (!canEditTemplates || !templateId) {
      setError("No tienes permisos para eliminar plantillas");
      return;
    }

    try {
      await deleteDoc(doc(db, "templates", templateId));
      setRefreshKey((prev) => prev + 1);
      setShowDeleteConfirm(null);
      setError("");
    } catch (err) {
      console.error("❌ Error al eliminar plantilla:", err);
      setError(`Error al eliminar plantilla: ${(err as Error).message}`);
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

  // Vista en grid de plantillas
  const renderTemplateGrid = () => (
    <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xl-4 g-4">
      {(showAllTemplates ? templates : templates.slice(0, 8))
        .filter((doc) => doc.isActive)
        .map((template) => (
          <div key={template.id} className="col">
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
              setSelectedTemplate(null);
              setShowAllTemplates(false);
            }}
          >
            <i className="bi bi-files me-2"></i>
            Ver Plantillas
            <span className="badge bg-secondary ms-2">{templates.length}</span>
          </button>
        </li>

        {canManageTemplates && activeView !== "edit" && (
          <li className="nav-item">
            <button
              className={`nav-link ${activeView === "create" ? "active" : ""}`}
              onClick={() => setActiveView("create")}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Nueva plantilla
            </button>
          </li>
        )}

        {activeView === "edit" && selectedTemplate && (
          <li className="nav-item">
            <button className="nav-link active" disabled>
              <i className="bi bi-pencil me-2"></i>
              Editando: {selectedTemplate.title}
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
                <p className="mt-3 text-muted">Cargando plantillas...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-5">
                <div className="mb-3">
                  <i
                    className="bi bi-folder text-muted"
                    style={{ fontSize: "4rem" }}
                  ></i>
                </div>
                <h4 className="text-muted">No hay plantillas registradas</h4>
                <p className="text-muted mb-4">
                  Sube tu primera plantilla al repositorio
                </p>
                {canManageTemplates && (
                  <button
                    className="btn btn-info text-white"
                    onClick={() => setActiveView("create")}
                  >
                    <i className="bi bi-upload me-2"></i>
                    Subir Primera Plantilla
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
                        <h3 className="mb-0">{templates.length}</h3>
                        <p className="text-muted mb-0">Total</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-0 themed-surface">
                      <div className="card-body text-center">
                        <h3 className="mb-0">
                          {templates.filter((d) => d.isActive).length}
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
                                templates.map((d) => d.category).filter(Boolean)
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
                    <div className="card border-0 themed-surface">
                      <div className="card-body text-center">
                        <h5 className="mb-0">{countByFileType("word")}</h5>
                        <p className="text-muted mb-0 small">Word</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card border-0 themed-surface">
                      <div className="card-body text-center">
                        <h5 className="mb-0">{countByFileType("excel")}</h5>
                        <p className="text-muted mb-0 small">Excel</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card border-0 themed-surface">
                      <div className="card-body text-center">
                        <h5 className="mb-0">
                          {countByFileType("powerpoint")}
                        </h5>
                        <p className="text-muted mb-0 small">PowerPoint</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card border-0 themed-surface">
                      <div className="card-body text-center">
                        <h5 className="mb-0">{countByFileType("image")}</h5>
                        <p className="text-muted mb-0 small">Imágenes</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card border-0 themed-surface">
                      <div className="card-body text-center">
                        <h5 className="mb-0">{countByFileType("text")}</h5>
                        <p className="text-muted mb-0 small">Texto</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card border-0 themed-surface">
                      <div className="card-body text-center">
                        <h5 className="mb-0">{countByFileType("zip")}</h5>
                        <p className="text-muted mb-0 small">Zip</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabla de plantillas (para administradores) */}
                {canEditTemplates && (
                  <div className="card border-0 shadow-sm mb-4">
                    <div className="card-header bg-info text-white">
                      <h5 className="mb-0">
                        <i className="bi bi-list-ul me-2"></i>
                        Gestión de plantillas
                      </h5>
                    </div>
                    <div className="card-body p-0">
                      <div className="table-responsive">
                        <table className="table table-hover mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>Plantilla</th>
                              <th>Tipo</th>
                              <th>Creador</th>
                              <th>Fecha</th>
                              <th>Estado</th>
                              <th>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {templates.map((doc) => (
                              <tr key={doc.id}>
                                <td>
                                  <div className="d-flex align-items-center">
                                    {doc.thumbnailUrl ? (
                                      <div
                                        className="rounded me-3"
                                        style={{
                                          position: "relative",
                                          width: "40px",
                                          height: "40px",
                                        }}
                                      >
                                        <Image
                                          src={doc.thumbnailUrl}
                                          alt={doc.title}
                                          fill
                                          sizes="40px"
                                          className="rounded"
                                          style={{
                                            objectFit: "cover",
                                          }}
                                          unoptimized={
                                            process.env.NODE_ENV !==
                                            "production"
                                          }
                                        />
                                      </div>
                                    ) : (
                                      <div
                                        className="rounded bg-secondary d-flex align-items-center justify-content-center me-3"
                                        style={{
                                          width: "40px",
                                          height: "40px",
                                        }}
                                      >
                                        <i
                                          className={`bi ${getFileIcon(
                                            doc.fileType
                                          )} text-white`}
                                        ></i>
                                      </div>
                                    )}
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
                                  <span className="badge bg-light text-dark">
                                    {doc.fileType
                                      ?.split("/")
                                      .pop()
                                      ?.toUpperCase() || "N/A"}
                                  </span>
                                </td>
                                <td>{doc.creator}</td>
                                <td>
                                  <small className="text-muted">
                                    {formatDate(doc.createdAt)}
                                  </small>
                                </td>
                                <td>
                                  {doc.isActive ? (
                                    <span className="badge bg-success">
                                      <i className="bi bi-check-circle me-1"></i>
                                      Activo
                                    </span>
                                  ) : (
                                    <span className="badge bg-secondary">
                                      <i className="bi bi-x-circle me-1"></i>
                                      Inactivo
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <div className="d-flex flex-wrap gap-2">
                                    <a
                                      href={doc.templateUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-sm btn-outline-primary d-flex align-items-center"
                                      title="Ver plantilla"
                                    >
                                      <i className="bi bi-eye me-1"></i>
                                      Ver
                                    </a>
                                    {canEditTemplates && (
                                      <>
                                        <button
                                          className="btn btn-sm btn-outline-info d-flex align-items-center"
                                          onClick={() =>
                                            handleEditTemplate(doc)
                                          }
                                          title="Editar plantilla"
                                        >
                                          <i className="bi bi-pencil me-1"></i>
                                          Editar
                                        </button>
                                        <button
                                          className="btn btn-sm btn-outline-warning d-flex align-items-center"
                                          onClick={() =>
                                            handleToggleTemplateStatus(doc)
                                          }
                                          title={
                                            doc.isActive
                                              ? "Desactivar plantilla"
                                              : "Activar plantilla"
                                          }
                                        >
                                          {doc.isActive ? (
                                            <>
                                              <i className="bi bi-pause me-1"></i>
                                              Desactivar
                                            </>
                                          ) : (
                                            <>
                                              <i className="bi bi-play me-1"></i>
                                              Activar
                                            </>
                                          )}
                                        </button>
                                        <button
                                          className="btn btn-sm btn-outline-danger d-flex align-items-center"
                                          onClick={() =>
                                            setShowDeleteConfirm(doc.id || null)
                                          }
                                          title="Eliminar plantilla"
                                        >
                                          <i className="bi bi-trash me-1"></i>
                                          Eliminar
                                        </button>
                                      </>
                                    )}
                                  </div>

                                  {/* Modal de confirmación de eliminación */}
                                  {showDeleteConfirm === doc.id && (
                                    <div
                                      className="modal fade show d-block"
                                      style={{ background: "rgba(0,0,0,0.5)" }}
                                      tabIndex={-1}
                                    >
                                      <div className="modal-dialog modal-dialog-centered">
                                        <div className="modal-content">
                                          <div className="modal-header bg-danger text-white">
                                            <h5 className="modal-title">
                                              <i className="bi bi-exclamation-triangle me-2"></i>
                                              Confirmar Eliminación
                                            </h5>
                                          </div>
                                          <div className="modal-body">
                                            <p>
                                              ¿Estás seguro de que deseas
                                              eliminar la plantilla{" "}
                                              <strong>{doc.title}</strong>?
                                            </p>
                                            <p className="text-danger">
                                              <i className="bi bi-exclamation-circle me-1"></i>
                                              Esta acción no se puede deshacer.
                                            </p>
                                          </div>
                                          <div className="modal-footer">
                                            <button
                                              type="button"
                                              className="btn btn-outline-secondary d-flex align-items-center"
                                              onClick={() =>
                                                setShowDeleteConfirm(null)
                                              }
                                            >
                                              <i className="bi bi-x-circle me-1"></i>
                                              Cancelar
                                            </button>
                                            <button
                                              type="button"
                                              className="btn btn-danger d-flex align-items-center"
                                              onClick={() =>
                                                doc.id &&
                                                handleDeleteTemplate(doc.id)
                                              }
                                            >
                                              <i className="bi bi-trash me-1"></i>
                                              Confirmar Eliminación
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="card-footer themed-surface">
                      <small className="text-muted">
                        Mostrando {templates.length} plantilla(s)
                      </small>
                    </div>
                  </div>
                )}

                {/* Grid de plantillas (para todos los usuarios) */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">
                      <i className="bi bi-folder2-open me-2"></i>
                      Repositorio de Plantillas
                    </h5>
                    {templates.length > 8 && (
                      <button
                        className="btn btn-outline-info btn-sm"
                        onClick={() => setShowAllTemplates(!showAllTemplates)}
                      >
                        {showAllTemplates
                          ? "Ver menos"
                          : `Ver todos (${templates.length})`}
                      </button>
                    )}
                  </div>

                  {renderTemplateGrid()}
                </div>
              </div>
            )}
          </div>
        )}

        {(activeView === "create" || activeView === "edit") && (
          <div className="row">
            <div className="col-12 col-lg-8">
              <TemplateForm
                onSuccess={handleTemplateCreated}
                templateToEdit={
                  activeView === "edit" ? selectedTemplate : undefined
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
                    Tips para plantillas
                  </h5>
                  <ul className="list-unstyled">
                    <li className="mb-2">
                      <small className="text-muted">
                        1. Asegúrate de que la plantilla tenga permisos de
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
                        5. Asigna categorías para organizar tus plantillas
                      </small>
                    </li>
                  </ul>

                  {activeView === "edit" && selectedTemplate && (
                    <div className="mt-4 pt-3 border-top">
                      <h6 className="text-primary">
                        <i className="bi bi-info-circle me-2"></i>
                        Editando Plantilla
                      </h6>
                      <p className="small text-muted">
                        Estás editando:{" "}
                        <strong>{selectedTemplate.title}</strong>
                      </p>
                      <p className="small text-muted">
                        Creado: {formatDate(selectedTemplate.createdAt)}
                      </p>
                      <button
                        className="btn btn-outline-secondary btn-sm w-100"
                        onClick={handleCancelEdit}
                      >
                        <i className="bi bi-arrow-left me-1"></i>
                        Cancelar Edición
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

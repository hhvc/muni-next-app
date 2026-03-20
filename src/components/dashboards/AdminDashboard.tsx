// src/components/dashboards/AdminDashboard.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase/clientApp";
import FormsManager from "@/components/forms/FormsManager";
import UsersTable from "./UsersTable";
import InvitationsTable from "./InvitationsTable";
import LookersManager from "@/components/lookers/LookersManager";
import DocumentsManager from "@/components/documents/DocumentsManager"; // Importar DocumentsManager
import RequirementsList from "@/components/requirements/RequirementsList";
import BackButton from "@/components/ui/BackButton";

type AdminTab =
  | "requirements"
  | "forms"
  | "lookers"
  | "documents" // Nueva pestaña
  | "users"
  | "invitations"
  | "settings";

export default function AdminDashboard() {
  const { userRoles } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("requirements");
  const [stats, setStats] = useState({
    formsCount: 0,
    dashboardsCount: 0,
    usersCount: 0,
    invitationsCount: 0,
    requirementsCount: 0,
    requirementsInicial: 0,
    requirementsEnRevision: 0,
    requirementsEnProgreso: 0,
    requirementsCompletados: 0,
    requirementsRechazados: 0,
    documentsCount: 0, // Nueva estadística
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Verificar si el usuario es admin
  const isAdmin =
    userRoles?.includes("admin") ||
    userRoles?.includes("root") ||
    userRoles?.includes("data");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true);

        // Contar formularios
        const formsSnapshot = await getDocs(collection(db, "forms"));
        const formsCount = formsSnapshot.size;

        // Contar dashboards (tableros)
        const dashboardsSnapshot = await getDocs(collection(db, "dashboards"));
        const dashboardsCount = dashboardsSnapshot.size;

        // Contar usuarios
        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersCount = usersSnapshot.size;

        // Contar invitaciones (usando candidateInvitations)
        const invitationsSnapshot = await getDocs(
          collection(db, "candidateInvitations"),
        );
        const invitationsCount = invitationsSnapshot.size;

        // ✅ Contar requerimientos por estado
        const requirementsSnapshot = await getDocs(
          collection(db, "requirements"),
        );
        const requirements = requirementsSnapshot.docs.map((doc) => doc.data());

        const requirementsCount = requirementsSnapshot.size;
        const requirementsInicial = requirements.filter(
          (r) => r.estado === "inicial",
        ).length;
        const requirementsEnRevision = requirements.filter(
          (r) => r.estado === "en_revision",
        ).length;
        const requirementsEnProgreso = requirements.filter(
          (r) => r.estado === "en_progreso",
        ).length;
        const requirementsCompletados = requirements.filter(
          (r) => r.estado === "completado",
        ).length;
        const requirementsRechazados = requirements.filter(
          (r) => r.estado === "rechazado",
        ).length;

        // ✅ Contar documentos (nueva estadística)
        const documentsSnapshot = await getDocs(collection(db, "documents"));
        const documentsCount = documentsSnapshot.size;

        setStats({
          formsCount,
          dashboardsCount,
          usersCount,
          invitationsCount,
          requirementsCount,
          requirementsInicial,
          requirementsEnRevision,
          requirementsEnProgreso,
          requirementsCompletados,
          requirementsRechazados,
          documentsCount, // Agregar al estado
        });
      } catch (error) {
        console.error("Error al cargar estadísticas:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Acceso Denegado</h4>
          <p>No tienes permisos para acceder al panel de administración.</p>
        </div>
      </div>
    );
  }

  // ✅ Opciones del menú de navegación ACTUALIZADAS
  const menuItems = [
    {
      id: "requirements" as AdminTab,
      label: "📨 Requerimientos",
      icon: "bi-clipboard-check",
      color: "purple",
      bgClass: "bg-purple",
    },
    {
      id: "forms" as AdminTab,
      label: "📋 Formularios",
      icon: "bi-list-ul",
      color: "primary",
      bgClass: "bg-primary",
    },
    {
      id: "lookers" as AdminTab,
      label: "📊 Tableros",
      icon: "bi-bar-chart-line",
      color: "info",
      bgClass: "bg-info",
    },
    {
      id: "documents" as AdminTab, // Nueva opción
      label: "📄 Documentos",
      icon: "bi-files",
      color: "secondary",
      bgClass: "bg-secondary",
    },
    {
      id: "users" as AdminTab,
      label: "👥 Usuarios",
      icon: "bi-people",
      color: "success",
      bgClass: "bg-success",
    },
    // {
    //   id: "invitations" as AdminTab,
    //   label: "✉️ Invitaciones",
    //   icon: "bi-envelope",
    //   color: "warning",
    //   bgClass: "bg-warning",
    // },
    {
      id: "settings" as AdminTab,
      label: "⚙️ Configuración",
      icon: "bi-gear",
      color: "secondary",
      bgClass: "bg-secondary",
    },
  ];

  return (
    <div className="container-fluid mt-3">
      {/* Header con título y badge */}
      <div className="row mb-3">
        <div className="col-12">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
            <div>
              <h1 className="h3 mb-0 text-white">
                <i className="bi bi-shield-check me-2"></i>
                Panel de Administración
              </h1>
              <p className="text-white mb-0">
                Gestiona todos los recursos del sistema municipal
              </p>
            </div>

            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-primary">
                {userRoles?.includes("root") ? "Root Admin" : "Administrador"}
              </span>

              <BackButton className="btn btn-outline-light btn-sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Panel de navegación horizontal */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-primary text-white py-2">
              <h6 className="mb-0">
                <i className="bi bi-menu-button-wide me-2"></i>
                Navegación
              </h6>
            </div>
            <div className="card-body p-2">
              <div className="d-flex flex-wrap gap-2">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    className={`btn btn-sm ${
                      activeTab === item.id
                        ? `${item.bgClass} text-white`
                        : `btn-outline-${item.color}`
                    }`}
                    onClick={() => setActiveTab(item.id)}
                    style={{ minWidth: "140px" }}
                  >
                    <i className={`bi ${item.icon} me-2`}></i>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal según pestaña activa */}
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-dark text-white">
              <h5 className="mb-0">
                {activeTab === "requirements" && (
                  <>
                    <i className="bi bi-clipboard-check me-2"></i>Gestión de
                    Requerimientos
                  </>
                )}
                {activeTab === "forms" && (
                  <>
                    <i className="bi bi-list-ul me-2"></i>Gestión de Formularios
                  </>
                )}
                {activeTab === "lookers" && (
                  <>
                    <i className="bi bi-bar-chart-line me-2"></i>Gestión de
                    Tableros
                  </>
                )}
                {activeTab === "documents" && ( // Nuevo título
                  <>
                    <i className="bi bi-files me-2"></i>Gestión de Documentos
                  </>
                )}
                {activeTab === "users" && (
                  <>
                    <i className="bi bi-people me-2"></i>Gestión de Usuarios
                  </>
                )}
                {activeTab === "invitations" && (
                  <>
                    <i className="bi bi-envelope me-2"></i>Gestión de
                    Invitaciones
                  </>
                )}
                {activeTab === "settings" && (
                  <>
                    <i className="bi bi-gear me-2"></i>Configuración
                  </>
                )}
              </h5>
              <p className="mb-0 small text-muted">
                {activeTab === "requirements" &&
                  "Gestiona todos los requerimientos de datos solicitados por usuarios"}
                {activeTab === "forms" &&
                  "Administra y visualiza todos los formularios de Google Forms"}
                {activeTab === "lookers" &&
                  "Administra y visualiza todos los dashboards de Looker Studio. Puedes ver, editar, eliminar y cambiar el estado."}
                {activeTab === "documents" && // Nueva descripción
                  "Administra y visualiza todos los documentos del sistema. Puedes ver, editar, eliminar y cambiar el estado."}
                {activeTab === "users" && "Gestiona usuarios y permisos"}
                {activeTab === "invitations" &&
                  "Crea y gestiona invitaciones para nuevos usuarios"}
                {activeTab === "settings" && "Configura parámetros del sistema"}
              </p>
            </div>
            <div className="card-body">
              {/* ✅ Gestión de Requerimientos */}
              {activeTab === "requirements" && (
                <div>
                  <div
                    className="alert alert-purple mb-4"
                    role="alert"
                    style={{ backgroundColor: "#6f42c1", color: "white" }}
                  >
                    <i className="bi bi-info-circle me-2"></i>
                    Aquí puedes gestionar todos los requerimientos de datos
                    solicitados por los usuarios. Puedes asignar responsables,
                    cambiar estados y agregar comentarios.
                  </div>
                  <RequirementsList />
                </div>
              )}

              {activeTab === "forms" && (
                <div>
                  <div className="alert alert-info mb-4" role="alert">
                    <i className="bi bi-info-circle me-2"></i>
                    Aquí puedes gestionar todos los formularios registrados en
                    el sistema. Puedes ver, editar y eliminar formularios.
                  </div>
                  <FormsManager />
                </div>
              )}

              {activeTab === "lookers" && (
                <div>
                  <div className="alert alert-info mb-4" role="alert">
                    <i className="bi bi-info-circle me-2"></i>
                    Aquí puedes gestionar todos los tableros de Looker Studio
                    registrados en el sistema. Puedes ver, editar, eliminar y
                    cambiar el estado de los tableros.
                  </div>
                  <LookersManager />
                </div>
              )}

              {activeTab === "documents" && ( // Nueva sección de documentos
                <div>
                  <div className="alert alert-info mb-4" role="alert">
                    <i className="bi bi-info-circle me-2"></i>
                    Aquí puedes gestionar todos los documentos registrados en el
                    sistema. Puedes ver, editar, eliminar y cambiar el estado de
                    los documentos.
                  </div>
                  <DocumentsManager />
                </div>
              )}

              {activeTab === "users" && (
                <div>
                  <div className="alert alert-info mb-4" role="alert">
                    <i className="bi bi-info-circle me-2"></i>
                    Gestiona los usuarios del sistema. Puedes ver roles, editar
                    permisos y más.
                  </div>
                  <UsersTable />
                </div>
              )}

              {activeTab === "invitations" && (
                <div>
                  <div className="alert alert-info mb-4" role="alert">
                    <i className="bi bi-info-circle me-2"></i>
                    Crea y gestiona invitaciones para nuevos usuarios del
                    sistema.
                  </div>
                  <InvitationsTable />
                </div>
              )}

              {activeTab === "settings" && (
                <div>
                  <div className="alert alert-info mb-4" role="alert">
                    <i className="bi bi-info-circle me-2"></i>
                    Configura los parámetros del sistema.
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="card border-primary mb-4">
                        <div className="card-header bg-primary text-white">
                          <h6 className="mb-0">
                            <i className="bi bi-gear me-2"></i>
                            Configuración General
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="mb-3">
                            <label className="form-label">
                              Nombre del Sistema
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Sistema Municipal"
                            />
                          </div>
                          <div className="mb-3">
                            <label className="form-label">
                              Tiempo de Sesión (minutos)
                            </label>
                            <input
                              type="number"
                              className="form-control"
                              defaultValue="30"
                              min="5"
                              max="240"
                            />
                          </div>
                          <button className="btn btn-primary">
                            Guardar Configuración
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="card border-info mb-4">
                        <div className="card-header bg-info text-white">
                          <h6 className="mb-0">
                            <i className="bi bi-bell me-2"></i>
                            Notificaciones
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="form-check mb-3">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="notifyNewUsers"
                              defaultChecked
                            />
                            <label
                              className="form-check-label"
                              htmlFor="notifyNewUsers"
                            >
                              Notificar nuevos usuarios registrados
                            </label>
                          </div>
                          <div className="form-check mb-3">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="notifyFormSubmissions"
                              defaultChecked
                            />
                            <label
                              className="form-check-label"
                              htmlFor="notifyFormSubmissions"
                            >
                              Notificar envíos de formularios
                            </label>
                          </div>
                          <div className="form-check mb-3">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="notifyNewRequirements"
                              defaultChecked
                            />
                            <label
                              className="form-check-label"
                              htmlFor="notifyNewRequirements"
                            >
                              Notificar nuevos requerimientos
                            </label>
                          </div>
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="notifyDashboardUsage"
                            />
                            <label
                              className="form-check-label"
                              htmlFor="notifyDashboardUsage"
                            >
                              Notificar uso de tableros
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="card border-secondary">
                    <div className="card-header bg-secondary text-white">
                      <h6 className="mb-0">
                        <i className="bi bi-database me-2"></i>
                        Mantenimiento
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="d-flex gap-2">
                        <button className="btn btn-outline-secondary">
                          <i className="bi bi-download me-2"></i>
                          Backup de Datos
                        </button>
                        <button className="btn btn-outline-secondary">
                          <i className="bi bi-trash me-2"></i>
                          Limpiar Cache
                        </button>
                        <button className="btn btn-outline-danger">
                          <i className="bi bi-exclamation-triangle me-2"></i>
                          Modo Mantenimiento
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas de Requerimientos */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-purple text-white py-2">
              <h6 className="mb-0">
                <i className="bi bi-clipboard-data me-2"></i>
                Estadísticas de Requerimientos
              </h6>
            </div>
            <div className="card-body p-3">
              <div className="row g-2">
                {/* Total */}
                <div className="col-md-2 col-6">
                  <div className="card bg-purple text-white">
                    <div className="card-body text-center p-2">
                      <h6 className="card-title mb-1">Total</h6>
                      <h4 className="mb-0">
                        {loadingStats ? (
                          <div
                            className="spinner-border spinner-border-sm"
                            role="status"
                          >
                            <span className="visually-hidden">Cargando...</span>
                          </div>
                        ) : (
                          stats.requirementsCount
                        )}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Inicial */}
                <div className="col-md-2 col-6">
                  <div className="card bg-secondary text-white">
                    <div className="card-body text-center p-2">
                      <h6 className="card-title mb-1">Inicial</h6>
                      <h4 className="mb-0">
                        {loadingStats ? (
                          <div
                            className="spinner-border spinner-border-sm"
                            role="status"
                          >
                            <span className="visually-hidden">Cargando...</span>
                          </div>
                        ) : (
                          stats.requirementsInicial
                        )}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* En Revisión */}
                <div className="col-md-2 col-6">
                  <div className="card bg-info text-white">
                    <div className="card-body text-center p-2">
                      <h6 className="card-title mb-1">En Revisión</h6>
                      <h4 className="mb-0">
                        {loadingStats ? (
                          <div
                            className="spinner-border spinner-border-sm"
                            role="status"
                          >
                            <span className="visually-hidden">Cargando...</span>
                          </div>
                        ) : (
                          stats.requirementsEnRevision
                        )}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* En Progreso */}
                <div className="col-md-2 col-6">
                  <div className="card bg-warning text-white">
                    <div className="card-body text-center p-2">
                      <h6 className="card-title mb-1">En Progreso</h6>
                      <h4 className="mb-0">
                        {loadingStats ? (
                          <div
                            className="spinner-border spinner-border-sm"
                            role="status"
                          >
                            <span className="visually-hidden">Cargando...</span>
                          </div>
                        ) : (
                          stats.requirementsEnProgreso
                        )}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Completados */}
                <div className="col-md-2 col-6">
                  <div className="card bg-success text-white">
                    <div className="card-body text-center p-2">
                      <h6 className="card-title mb-1">Completados</h6>
                      <h4 className="mb-0">
                        {loadingStats ? (
                          <div
                            className="spinner-border spinner-border-sm"
                            role="status"
                          >
                            <span className="visually-hidden">Cargando...</span>
                          </div>
                        ) : (
                          stats.requirementsCompletados
                        )}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Rechazados */}
                <div className="col-md-2 col-6">
                  <div className="card bg-danger text-white">
                    <div className="card-body text-center p-2">
                      <h6 className="card-title mb-1">Rechazados</h6>
                      <h4 className="mb-0">
                        {loadingStats ? (
                          <div
                            className="spinner-border spinner-border-sm"
                            role="status"
                          >
                            <span className="visually-hidden">Cargando...</span>
                          </div>
                        ) : (
                          stats.requirementsRechazados
                        )}
                      </h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Otras estadísticas - ACTUALIZADO con documentos */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-primary text-white py-2">
              <h6 className="mb-0">
                <i className="bi bi-bar-chart-line me-2"></i>
                Estadísticas Generales
              </h6>
            </div>
            <div className="card-body p-3">
              <div className="row g-2">
                <div className="col-md-3 col-6">
                  <div className="card bg-primary text-white">
                    <div className="card-body p-2">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="card-title mb-0">Formularios</h6>
                          <h4 className="mb-0">
                            {loadingStats ? (
                              <div
                                className="spinner-border spinner-border-sm"
                                role="status"
                              >
                                <span className="visually-hidden">
                                  Cargando...
                                </span>
                              </div>
                            ) : (
                              stats.formsCount
                            )}
                          </h4>
                        </div>
                        <div>
                          <i
                            className="bi bi-file-earmark-text"
                            style={{ fontSize: "1.5rem" }}
                          ></i>
                        </div>
                      </div>
                      <small className="d-block mt-1">Total registrados</small>
                    </div>
                  </div>
                </div>

                <div className="col-md-3 col-6">
                  <div className="card bg-info text-white">
                    <div className="card-body p-2">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="card-title mb-0">Tableros</h6>
                          <h4 className="mb-0">
                            {loadingStats ? (
                              <div
                                className="spinner-border spinner-border-sm"
                                role="status"
                              >
                                <span className="visually-hidden">
                                  Cargando...
                                </span>
                              </div>
                            ) : (
                              stats.dashboardsCount
                            )}
                          </h4>
                        </div>
                        <div>
                          <i
                            className="bi bi-bar-chart-line"
                            style={{ fontSize: "1.5rem" }}
                          ></i>
                        </div>
                      </div>
                      <small className="d-block mt-1">Looker Studio</small>
                    </div>
                  </div>
                </div>

                <div className="col-md-3 col-6">
                  <div className="card bg-secondary text-white">
                    {" "}
                    {/* Color secundario para documentos */}
                    <div className="card-body p-2">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="card-title mb-0">Documentos</h6>
                          <h4 className="mb-0">
                            {loadingStats ? (
                              <div
                                className="spinner-border spinner-border-sm"
                                role="status"
                              >
                                <span className="visually-hidden">
                                  Cargando...
                                </span>
                              </div>
                            ) : (
                              stats.documentsCount
                            )}
                          </h4>
                        </div>
                        <div>
                          <i
                            className="bi bi-files"
                            style={{ fontSize: "1.5rem" }}
                          ></i>
                        </div>
                      </div>
                      <small className="d-block mt-1">Total en sistema</small>
                    </div>
                  </div>
                </div>

                <div className="col-md-3 col-6">
                  <div className="card bg-success text-white">
                    <div className="card-body p-2">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="card-title mb-0">Usuarios</h6>
                          <h4 className="mb-0">
                            {loadingStats ? (
                              <div
                                className="spinner-border spinner-border-sm"
                                role="status"
                              >
                                <span className="visually-hidden">
                                  Cargando...
                                </span>
                              </div>
                            ) : (
                              stats.usersCount
                            )}
                          </h4>
                        </div>
                        <div>
                          <i
                            className="bi bi-people"
                            style={{ fontSize: "1.5rem" }}
                          ></i>
                        </div>
                      </div>
                      <small className="d-block mt-1">Activos</small>
                    </div>
                  </div>
                </div>

                {/* Por ahora las invitaciones están en desuso y por eso no se muestran. */}
                {/*
                 <div className="col-md-3 col-6">
                  <div className="card bg-warning text-white">
                    <div className="card-body p-2">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="card-title mb-0">Invitaciones</h6>
                          <h4 className="mb-0">
                            {loadingStats ? (
                              <div
                                className="spinner-border spinner-border-sm"
                                role="status"
                              >
                                <span className="visually-hidden">
                                  Cargando...
                                </span>
                              </div>
                            ) : (
                              stats.invitationsCount
                            )}
                          </h4>
                        </div>
                        <div>
                          <i
                            className="bi bi-envelope"
                            style={{ fontSize: "1.5rem" }}
                          ></i>
                        </div>
                      </div>
                      <small className="d-block mt-1">Pendientes</small>
                    </div>
                  </div>
                </div>
                 */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

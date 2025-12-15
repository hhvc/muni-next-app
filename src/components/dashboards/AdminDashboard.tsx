// src/components/dashboards/AdminDashboard.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase/clientApp";
import FormsManager from "@/components/forms/FormsManager";
import FormCreator from "@/components/forms/FormCreator";
import UsersTable from "./UsersTable";
import InvitationsTable from "./InvitationsTable";
import DashboardsGrid from "@/components/lookers/DashboardsGrid";
import DashboardCreator from "@/components/lookers/DashboardCreator";
import RequirementsList from "@/components/requirements/RequirementsList";

type AdminTab =
  | "requirements" // ✅ Ahora primero
  | "forms"
  | "create-form"
  | "lookers"
  | "create-looker"
  | "users"
  | "invitations"
  | "settings";

export default function AdminDashboard() {
  const { userRoles } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("requirements"); // ✅ Por defecto en requerimientos
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
          collection(db, "candidateInvitations")
        );
        const invitationsCount = invitationsSnapshot.size;

        // ✅ Contar requerimientos por estado
        const requirementsSnapshot = await getDocs(
          collection(db, "requirements")
        );
        const requirements = requirementsSnapshot.docs.map((doc) => doc.data());

        const requirementsCount = requirementsSnapshot.size;
        const requirementsInicial = requirements.filter(
          (r) => r.estado === "inicial"
        ).length;
        const requirementsEnRevision = requirements.filter(
          (r) => r.estado === "en_revision"
        ).length;
        const requirementsEnProgreso = requirements.filter(
          (r) => r.estado === "en_progreso"
        ).length;
        const requirementsCompletados = requirements.filter(
          (r) => r.estado === "completado"
        ).length;
        const requirementsRechazados = requirements.filter(
          (r) => r.estado === "rechazado"
        ).length;

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

  // ✅ Opciones del menú de navegación - REQUERIMIENTOS PRIMERO
  const menuItems = [
    {
      id: "requirements" as AdminTab,
      label: "📨 Requerimientos",
      icon: "bi-clipboard-check",
      color: "purple",
    },
    {
      id: "forms" as AdminTab,
      label: "📋 Formularios",
      icon: "bi-list-ul",
      color: "primary",
    },
    {
      id: "create-form" as AdminTab,
      label: "➕ Nuevo Formulario",
      icon: "bi-plus-circle",
      color: "primary",
    },
    {
      id: "lookers" as AdminTab,
      label: "📊 Tableros",
      icon: "bi-bar-chart-line",
      color: "info",
    },
    {
      id: "create-looker" as AdminTab,
      label: "➕ Nuevo Tablero",
      icon: "bi-plus-circle",
      color: "info",
    },
    {
      id: "users" as AdminTab,
      label: "👥 Usuarios",
      icon: "bi-people",
      color: "success",
    },
    {
      id: "invitations" as AdminTab,
      label: "✉️ Invitaciones",
      icon: "bi-envelope",
      color: "warning",
    },
    {
      id: "settings" as AdminTab,
      label: "⚙️ Configuración",
      icon: "bi-gear",
      color: "secondary",
    },
  ];

  // Función para manejar éxito en creación
  const handleFormSuccess = () => {
    setActiveTab("forms");
  };

  const handleDashboardSuccess = () => {
    setActiveTab("lookers");
  };

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        {/* Sidebar de navegación */}
        <div className="col-md-3 col-lg-2 mb-4">
          <div
            className="card border-0 shadow-sm sticky-top"
            style={{ top: "20px" }}
          >
            <div className="card-header bg-gradient-primary text-muted">
              <h5 className="mb-0">
                <i className="bi bi-shield-check me-2"></i>
                Panel Admin
              </h5>
            </div>
            <div className="card-body p-0">
              <nav className="nav flex-column">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    className={`nav-link text-start py-3 px-3 border-bottom ${
                      activeTab === item.id
                        ? `bg-light text-${item.color} fw-bold`
                        : "text-dark"
                    }`}
                    onClick={() => setActiveTab(item.id)}
                    style={{
                      borderRadius: 0,
                      borderLeft:
                        activeTab === item.id
                          ? `4px solid var(--bs-${item.color})`
                          : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <i className={`bi ${item.icon} me-2`}></i>
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
            <div className="card-footer bg-light">
              <small className="text-muted">
                <i className="bi bi-info-circle me-1"></i>
                Panel de administración completo
              </small>
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="col-md-9 col-lg-10">
          <div className="row mb-4">
            <div className="col-12">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h1 className="h3 mb-0 text-white">
                    {activeTab === "requirements" &&
                      "Gestión de Requerimientos"}
                    {activeTab === "forms" && "Gestión de Formularios"}
                    {activeTab === "create-form" && "Crear Nuevo Formulario"}
                    {activeTab === "lookers" && "Gestión de Tableros"}
                    {activeTab === "create-looker" && "Crear Nuevo Tablero"}
                    {activeTab === "users" && "Gestión de Usuarios"}
                    {activeTab === "invitations" && "Gestión de Invitaciones"}
                    {activeTab === "settings" && "Configuración"}
                  </h1>
                  <p className="text-white mb-0">
                    {activeTab === "requirements" &&
                      "Gestiona todos los requerimientos de datos solicitados por usuarios"}
                    {activeTab === "forms" &&
                      "Administra y visualiza todos los formularios de Google Forms"}
                    {activeTab === "create-form" &&
                      "Registra un nuevo formulario de Google en el sistema"}
                    {activeTab === "lookers" &&
                      "Administra y visualiza todos los dashboards de Looker Studio"}
                    {activeTab === "create-looker" &&
                      "Registra un nuevo dashboard de Looker Studio en el sistema"}
                    {activeTab === "users" && "Gestiona usuarios y permisos"}
                    {activeTab === "invitations" &&
                      "Crea y gestiona invitaciones para nuevos usuarios"}
                    {activeTab === "settings" &&
                      "Configura parámetros del sistema"}
                  </p>
                </div>
                <div className="text-end">
                  <span className="badge bg-primary">
                    {userRoles?.includes("root")
                      ? "Root Admin"
                      : "Administrador"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Contenido según pestaña activa */}
          <div className="row">
            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  {/* ✅ NUEVA SECCIÓN: Gestión de Requerimientos - AHORA PRIMERO */}
                  {activeTab === "requirements" && (
                    <div>
                      <div
                        className="alert alert-purple"
                        role="alert"
                        style={{ backgroundColor: "#6f42c1", color: "white" }}
                      >
                        <i className="bi bi-info-circle me-2"></i>
                        Aquí puedes gestionar todos los requerimientos de datos
                        solicitados por los usuarios. Puedes asignar
                        responsables, cambiar estados y agregar comentarios.
                      </div>

                      <RequirementsList />
                    </div>
                  )}

                  {activeTab === "forms" && (
                    <div>
                      <div className="alert alert-info" role="alert">
                        <i className="bi bi-info-circle me-2"></i>
                        Aquí puedes gestionar todos los formularios registrados
                        en el sistema. Puedes ver, editar y eliminar
                        formularios.
                      </div>
                      <FormsManager />
                    </div>
                  )}

                  {activeTab === "create-form" && (
                    <div>
                      <div className="alert alert-info" role="alert">
                        <i className="bi bi-info-circle me-2"></i>
                        Completa los datos para registrar un nuevo formulario de
                        Google en el sistema.
                      </div>
                      <div className="row">
                        <div className="col-12 col-lg-8">
                          <FormCreator onSuccess={handleFormSuccess} />
                        </div>
                        <div className="col-12 col-lg-4">
                          <div className="card border-primary">
                            <div className="card-header bg-primary text-white">
                              <h6 className="mb-0">
                                <i className="bi bi-lightbulb me-2"></i>
                                Consejos para Formularios
                              </h6>
                            </div>
                            <div className="card-body">
                              <ul className="list-unstyled mb-0">
                                <li className="mb-2">
                                  <small>
                                    <i className="bi bi-check-circle text-success me-2"></i>
                                    Asegúrate de que el formulario de Google
                                    tenga permisos públicos
                                  </small>
                                </li>
                                <li className="mb-2">
                                  <small>
                                    <i className="bi bi-check-circle text-success me-2"></i>
                                    Usa categorías para organizar mejor los
                                    formularios
                                  </small>
                                </li>
                                <li className="mb-2">
                                  <small>
                                    <i className="bi bi-check-circle text-success me-2"></i>
                                    Asigna roles específicos si el formulario es
                                    restringido
                                  </small>
                                </li>
                                <li>
                                  <small>
                                    <i className="bi bi-check-circle text-success me-2"></i>
                                    El orden determina la posición en la lista
                                  </small>
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "lookers" && (
                    <div>
                      <div className="alert alert-info" role="alert">
                        <i className="bi bi-info-circle me-2"></i>
                        Aquí puedes gestionar todos los tableros de Looker
                        Studio registrados en el sistema.
                      </div>
                      <div className="mb-4">
                        <button
                          className="btn btn-info text-white"
                          onClick={() => setActiveTab("create-looker")}
                        >
                          <i className="bi bi-plus-circle me-2"></i>
                          Crear Nuevo Tablero
                        </button>
                      </div>
                      <DashboardsGrid showInactive={true} />
                    </div>
                  )}

                  {activeTab === "create-looker" && (
                    <div>
                      <div className="alert alert-info" role="alert">
                        <i className="bi bi-info-circle me-2"></i>
                        Completa los datos para registrar un nuevo tablero de
                        Looker Studio en el sistema.
                      </div>
                      <div className="row">
                        <div className="col-12 col-lg-8">
                          <DashboardCreator
                            onSuccess={handleDashboardSuccess}
                          />
                        </div>
                        <div className="col-12 col-lg-4">
                          <div className="card border-info">
                            <div className="card-header bg-info text-white">
                              <h6 className="mb-0">
                                <i className="bi bi-lightbulb me-2"></i>
                                Consejos para Tableros
                              </h6>
                            </div>
                            <div className="card-body">
                              <ul className="list-unstyled mb-0">
                                <li className="mb-2">
                                  <small>
                                    <i className="bi bi-check-circle text-success me-2"></i>
                                    Asegúrate de que el tablero tenga permisos
                                    de visualización públicos
                                  </small>
                                </li>
                                <li className="mb-2">
                                  <small>
                                    <i className="bi bi-check-circle text-success me-2"></i>
                                    Usa la URL de embed si está disponible para
                                    mejor integración
                                  </small>
                                </li>
                                <li className="mb-2">
                                  <small>
                                    <i className="bi bi-check-circle text-success me-2"></i>
                                    Agrega una miniatura para mejor experiencia
                                    visual
                                  </small>
                                </li>
                                <li className="mb-2">
                                  <small>
                                    <i className="bi bi-check-circle text-success me-2"></i>
                                    Especifica la fuente de datos para
                                    referencia
                                  </small>
                                </li>
                                <li>
                                  <small>
                                    <i className="bi bi-check-circle text-success me-2"></i>
                                    Indica la frecuencia de actualización del
                                    tablero
                                  </small>
                                </li>
                              </ul>
                            </div>
                          </div>
                          <div className="card border-warning mt-3">
                            <div className="card-header bg-warning text-dark">
                              <h6 className="mb-0">
                                <i className="bi bi-arrow-left-right me-2"></i>
                                Navegación Rápida
                              </h6>
                            </div>
                            <div className="card-body">
                              <button
                                className="btn btn-outline-info btn-sm w-100 mb-2"
                                onClick={() => setActiveTab("lookers")}
                              >
                                <i className="bi bi-arrow-left me-2"></i>
                                Volver a Tableros
                              </button>
                              <button
                                className="btn btn-outline-primary btn-sm w-100"
                                onClick={() => setActiveTab("create-form")}
                              >
                                <i className="bi bi-file-earmark-plus me-2"></i>
                                Crear Formulario
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "users" && (
                    <div>
                      <div className="alert alert-info" role="alert">
                        <i className="bi bi-info-circle me-2"></i>
                        Gestiona los usuarios del sistema. Puedes ver roles,
                        editar permisos y más.
                      </div>
                      <UsersTable />
                    </div>
                  )}

                  {activeTab === "invitations" && (
                    <div>
                      <div className="alert alert-info" role="alert">
                        <i className="bi bi-info-circle me-2"></i>
                        Crea y gestiona invitaciones para nuevos usuarios del
                        sistema.
                      </div>
                      <InvitationsTable />
                    </div>
                  )}

                  {activeTab === "settings" && (
                    <div>
                      <div className="alert alert-info" role="alert">
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

          {/* ✅ Estadísticas rápidas - MEJORADAS */}
          {/* Primera fila: Estadísticas de Requerimientos (siempre visible) */}
          <div className="row mt-4">
            <div className="col-12">
              <h5 className="text-white mb-3">
                Estadísticas de Requerimientos
              </h5>
            </div>

            {/* Total */}
            <div className="col-md-2 col-6 mb-3">
              <div className="card border-0 shadow-sm bg-gradient-purple text-muted">
                <div className="card-body text-center">
                  <h6 className="card-title">Total</h6>
                  <h3 className="mb-0">
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
                  </h3>
                </div>
              </div>
            </div>

            {/* Inicial */}
            <div className="col-md-2 col-6 mb-3">
              <div className="card border-0 shadow-sm bg-secondary text-muted">
                <div className="card-body text-center">
                  <h6 className="card-title">Inicial</h6>
                  <h3 className="mb-0">
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
                  </h3>
                </div>
              </div>
            </div>

            {/* En Revisión */}
            <div className="col-md-2 col-6 mb-3">
              <div className="card border-0 shadow-sm bg-info text-muted">
                <div className="card-body text-center">
                  <h6 className="card-title">En Revisión</h6>
                  <h3 className="mb-0">
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
                  </h3>
                </div>
              </div>
            </div>

            {/* En Progreso */}
            <div className="col-md-2 col-6 mb-3">
              <div className="card border-0 shadow-sm bg-warning text-muted">
                <div className="card-body text-center">
                  <h6 className="card-title">En Progreso</h6>
                  <h3 className="mb-0">
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
                  </h3>
                </div>
              </div>
            </div>

            {/* Completados */}
            <div className="col-md-2 col-6 mb-3">
              <div className="card border-0 shadow-sm bg-success text-muted">
                <div className="card-body text-center">
                  <h6 className="card-title">Completados</h6>
                  <h3 className="mb-0">
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
                  </h3>
                </div>
              </div>
            </div>

            {/* Rechazados */}
            <div className="col-md-2 col-6 mb-3">
              <div className="card border-0 shadow-sm bg-danger text-muted">
                <div className="card-body text-center">
                  <h6 className="card-title">Rechazados</h6>
                  <h3 className="mb-0">
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
                  </h3>
                </div>
              </div>
            </div>
          </div>

          {/* Segunda fila: Otras estadísticas */}
          <div className="row mt-2">
            <div className="col-md-3 col-6 mb-3">
              <div className="card border-0 shadow-sm bg-gradient-primary text-muted">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="card-title">Formularios</h6>
                      <h3 className="mb-0">
                        {loadingStats ? (
                          <div
                            className="spinner-border spinner-border-sm"
                            role="status"
                          >
                            <span className="visually-hidden">Cargando...</span>
                          </div>
                        ) : (
                          stats.formsCount
                        )}
                      </h3>
                    </div>
                    <div>
                      <i
                        className="bi bi-file-earmark-text"
                        style={{ fontSize: "2rem", opacity: 0.8 }}
                      ></i>
                    </div>
                  </div>
                  <div className="mt-2">
                    <small>
                      <i className="bi bi-arrow-up-circle me-1"></i>
                      <span className="ms-1">Total registrados</span>
                    </small>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3 col-6 mb-3">
              <div className="card border-0 shadow-sm bg-gradient-info text-muted">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="card-title">Tableros</h6>
                      <h3 className="mb-0">
                        {loadingStats ? (
                          <div
                            className="spinner-border spinner-border-sm"
                            role="status"
                          >
                            <span className="visually-hidden">Cargando...</span>
                          </div>
                        ) : (
                          stats.dashboardsCount
                        )}
                      </h3>
                    </div>
                    <div>
                      <i
                        className="bi bi-bar-chart-line"
                        style={{ fontSize: "2rem", opacity: 0.8 }}
                      ></i>
                    </div>
                  </div>
                  <div className="mt-2">
                    <small>
                      <i className="bi bi-graph-up me-1"></i>
                      <span className="ms-1">Looker Studio</span>
                    </small>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3 col-6 mb-3">
              <div className="card border-0 shadow-sm bg-gradient-success text-muted">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="card-title">Usuarios</h6>
                      <h3 className="mb-0">
                        {loadingStats ? (
                          <div
                            className="spinner-border spinner-border-sm"
                            role="status"
                          >
                            <span className="visually-hidden">Cargando...</span>
                          </div>
                        ) : (
                          stats.usersCount
                        )}
                      </h3>
                    </div>
                    <div>
                      <i
                        className="bi bi-people"
                        style={{ fontSize: "2rem", opacity: 0.8 }}
                      ></i>
                    </div>
                  </div>
                  <div className="mt-2">
                    <small>
                      <i className="bi bi-person-check me-1"></i>
                      <span className="ms-1">Activos</span>
                    </small>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3 col-6 mb-3">
              <div className="card border-0 shadow-sm bg-gradient-warning text-muted">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="card-title">Invitaciones</h6>
                      <h3 className="mb-0">
                        {loadingStats ? (
                          <div
                            className="spinner-border spinner-border-sm"
                            role="status"
                          >
                            <span className="visually-hidden">Cargando...</span>
                          </div>
                        ) : (
                          stats.invitationsCount
                        )}
                      </h3>
                    </div>
                    <div>
                      <i
                        className="bi bi-envelope"
                        style={{ fontSize: "2rem", opacity: 0.8 }}
                      ></i>
                    </div>
                  </div>
                  <div className="mt-2">
                    <small>
                      <i className="bi bi-hourglass-split me-1"></i>
                      <span className="ms-1">Pendientes</span>
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .bg-purple {
          background-color: #6f42c1;
        }
        .border-purple {
          border-color: #6f42c1;
        }
        .text-purple {
          color: #6f42c1;
        }
        .bg-gradient-purple {
          background: linear-gradient(45deg, #6f42c1, #a37de9);
        }
        .alert-purple {
          background-color: #6f42c1;
          color: white;
          border-color: #5a32a3;
        }
      `}</style>
    </div>
  );
}

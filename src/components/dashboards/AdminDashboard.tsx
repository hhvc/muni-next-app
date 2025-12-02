// src/components/dashboards/AdminDashboard.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import FormsManager from "@/components/forms/FormsManager";
import FormCreator from "@/components/forms/FormCreator";
import UsersTable from "./UsersTable";
import InvitationsTable from "./InvitationsTable";

type AdminTab = "forms" | "create-form" | "users" | "invitations" | "settings";

export default function AdminDashboard() {
  const { userRoles } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("forms");

  // Verificar si el usuario es admin
  const isAdmin = userRoles?.includes("admin") || userRoles?.includes("root");

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

  // Opciones del menú de navegación
  const menuItems = [
    { id: "forms" as AdminTab, label: "📋 Formularios", icon: "bi-list-ul" },
    {
      id: "create-form" as AdminTab,
      label: "➕ Nuevo Formulario",
      icon: "bi-plus-circle",
    },
    { id: "users" as AdminTab, label: "👥 Usuarios", icon: "bi-people" },
    {
      id: "invitations" as AdminTab,
      label: "✉️ Invitaciones",
      icon: "bi-envelope",
    },
    { id: "settings" as AdminTab, label: "⚙️ Configuración", icon: "bi-gear" },
  ];

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        {/* Sidebar de navegación */}
        <div className="col-md-3 col-lg-2 mb-4">
          <div
            className="card border-0 shadow-sm sticky-top"
            style={{ top: "20px" }}
          >
            <div className="card-header bg-primary text-white">
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
                        ? "bg-light text-primary fw-bold"
                        : "text-dark"
                    }`}
                    onClick={() => setActiveTab(item.id)}
                    style={{
                      borderRadius: 0,
                      borderLeft:
                        activeTab === item.id ? "4px solid #0d6efd" : "none",
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
                Panel de administración
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
                  <h1 className="h3 mb-0">
                    {activeTab === "forms" && "Gestión de Formularios"}
                    {activeTab === "create-form" && "Crear Nuevo Formulario"}
                    {activeTab === "users" && "Gestión de Usuarios"}
                    {activeTab === "invitations" && "Gestión de Invitaciones"}
                    {activeTab === "settings" && "Configuración"}
                  </h1>
                  <p className="text-muted mb-0">
                    {activeTab === "forms" &&
                      "Administra y visualiza todos los formularios"}
                    {activeTab === "create-form" &&
                      "Registra un nuevo formulario en el sistema"}
                    {activeTab === "users" && "Gestiona usuarios y permisos"}
                    {activeTab === "invitations" &&
                      "Crea y gestiona invitaciones"}
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
                          <FormCreator
                            onSuccess={() => {
                              // Opcional: Mostrar mensaje de éxito o redirigir
                              console.log("Formulario creado exitosamente");
                            }}
                          />
                        </div>
                        <div className="col-12 col-lg-4">
                          <div className="card border-primary">
                            <div className="card-header bg-primary text-white">
                              <h6 className="mb-0">
                                <i className="bi bi-lightbulb me-2"></i>
                                Consejos
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
                        Configura los parámetros del sistema. Esta sección está
                        en desarrollo.
                      </div>
                      <div className="text-center py-5">
                        <div className="mb-3">
                          <i
                            className="bi bi-gear text-primary"
                            style={{ fontSize: "4rem" }}
                          ></i>
                        </div>
                        <h4>Configuración del Sistema</h4>
                        <p className="text-muted">
                          Esta funcionalidad está en desarrollo. Pronto podrás
                          configurar:
                        </p>
                        <ul className="list-unstyled text-start d-inline-block">
                          <li className="mb-2">
                            <i className="bi bi-check-circle text-muted me-2"></i>
                            Parámetros generales
                          </li>
                          <li className="mb-2">
                            <i className="bi bi-check-circle text-muted me-2"></i>
                            Configuración de notificaciones
                          </li>
                          <li className="mb-2">
                            <i className="bi bi-check-circle text-muted me-2"></i>
                            Integraciones externas
                          </li>
                          <li>
                            <i className="bi bi-check-circle text-muted me-2"></i>
                            Backup y restauración
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Estadísticas rápidas */}
          <div className="row mt-4">
            <div className="col-md-3">
              <div className="card border-0 shadow-sm bg-primary text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h6 className="card-title">Formularios</h6>
                      <h3 className="mb-0">12</h3>
                    </div>
                    <div>
                      <i
                        className="bi bi-file-earmark-text"
                        style={{ fontSize: "2rem" }}
                      ></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 shadow-sm bg-success text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h6 className="card-title">Usuarios Activos</h6>
                      <h3 className="mb-0">45</h3>
                    </div>
                    <div>
                      <i
                        className="bi bi-people"
                        style={{ fontSize: "2rem" }}
                      ></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 shadow-sm bg-warning text-dark">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h6 className="card-title">Invitaciones</h6>
                      <h3 className="mb-0">8</h3>
                    </div>
                    <div>
                      <i
                        className="bi bi-envelope"
                        style={{ fontSize: "2rem" }}
                      ></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 shadow-sm bg-info text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h6 className="card-title">Esta Semana</h6>
                      <h3 className="mb-0">3</h3>
                    </div>
                    <div>
                      <i
                        className="bi bi-calendar-week"
                        style={{ fontSize: "2rem" }}
                      ></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

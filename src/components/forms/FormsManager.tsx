// src/components/forms/FormsManager.tsx
"use client";

import { useState } from "react";
import FormCreator from "@/components/forms/FormCreator";
import FormsGrid from "@/components/forms/FormsGrid";
import { useAuth } from "@/components/AuthProvider";

export default function FormsManager() {
  const { userRoles } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<"view" | "create">("view");

  // Verificar permisos para crear formularios
  const canCreateForms = userRoles?.some((role) =>
    ["admin", "hr", "root"].includes(role)
  );

  const handleFormCreated = () => {
    setRefreshKey((prev) => prev + 1);
    setActiveTab("view");
  };

  return (
    <div className="container-fluid">
      {/* Tabs de navegación */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "view" ? "active" : ""}`}
            onClick={() => setActiveTab("view")}
          >
            <i className="bi bi-list-ul me-2"></i>
            Ver Formularios
          </button>
        </li>
        {canCreateForms && (
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "create" ? "active" : ""}`}
              onClick={() => setActiveTab("create")}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Registrar Nuevo
            </button>
          </li>
        )}
      </ul>

      {/* Contenido de los tabs */}
      <div className="tab-content">
        {activeTab === "view" ? (
          <div key={refreshKey}>
            <FormsGrid />
          </div>
        ) : (
          <div className="row">
            <div className="col-12 col-lg-8">
              <FormCreator onSuccess={handleFormCreated} />
            </div>
            <div className="col-12 col-lg-4">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <h5 className="card-title">
                    📋 Tip para formularios de Google
                  </h5>
                  <ul className="list-unstyled">
                    <li className="mb-2">
                      <small className="text-muted">
                        1. Asegúrate de que el formulario tenga permisos de
                        Cualquier persona con el enlace puede responder
                      </small>
                    </li>
                    <li className="mb-2">
                      <small className="text-muted">
                        2. Copia la URL completa desde la barra de direcciones
                      </small>
                    </li>
                    <li className="mb-2">
                      <small className="text-muted">
                        3. Usa categorías para organizar tus formularios
                      </small>
                    </li>
                    <li>
                      <small className="text-muted">
                        4. Los íconos pueden ser URLs de imágenes o emojis
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

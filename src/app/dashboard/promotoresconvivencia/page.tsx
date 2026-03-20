// src/app/dashboard/guardiaurbana/page.tsx
"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import DashboardsGrid from "@/components/lookers/DashboardsGrid";
import FormsGrid from "@/components/forms/FormsGrid";
import BackButton from "@/components/ui/BackButton";

export default function GuardiaUrbanaPage() {
  return (
    <DashboardLayout>
      <div className="container-fluid py-4">
        {/* Encabezado */}
        <div className="d-flex justify-content-between align-items-start mb-4">
          <div>
            <h2 className="dashboard-title mb-1">
              Panel de Promotores de Convivencia
            </h2>
            <p className="dashboard-subtitle text-muted mb-0">
              Acceso a dashboards e instrumentos operativos de Promotores de
              Convivencia.
            </p>
          </div>

          <BackButton />
        </div>

        {/* Dashboards */}
        <div className="mb-5">
          <DashboardsGrid category="Convivencia" />
        </div>

        {/* Formularios */}
        <div>
          <FormsGrid category="Convivencia" />
        </div>
      </div>
    </DashboardLayout>
  );
}

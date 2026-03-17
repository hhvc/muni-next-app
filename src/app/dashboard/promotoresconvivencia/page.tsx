// src/app/dashboard/guardiaurbana/page.tsx
"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import DashboardsGrid from "@/components/lookers/DashboardsGrid";
import FormsGrid from "@/components/forms/FormsGrid";
import DashboardCard from "@/components/dashboards/DashboardCard";

export default function GuardiaUrbanaPage() {
  return (
    <DashboardLayout>
      <div className="container-fluid py-4">
        {/* Encabezado */}
        <div className="mb-4">
          <h2 className="dashboard-title mb-1">Panel de Promotores de Convivencia</h2>
          <p className="dashboard-subtitle text-muted mb-0">
            Acceso a dashboards e instrumentos operativos de Promotores de Convivencia.
          </p>
          {/* <DashboardCard
            icon="🔗"
            iconVariant="dark"
            title="QR Móvil Guardia Urbana"
            description="Acceso rápido a enlaces y recursos operativos móviles."
            action={
              <a
                href="https://linktr.ee/QRMovil_Gum"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-dark"
              >
                Abrir
              </a>
            }
          /> */}
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

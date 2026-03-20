// src/app/dashboard/guardiaurbana/page.tsx
"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import DashboardsGrid from "@/components/lookers/DashboardsGrid";
import FormsGrid from "@/components/forms/FormsGrid";
import DashboardCard from "@/components/dashboards/DashboardCard";
import BackButton from "@/components/ui/BackButton";

export default function GuardiaUrbanaPage() {
  return (
    <DashboardLayout>
      <div className="container-fluid py-4">
        {/* Encabezado */}

        <div className="d-flex justify-content-between align-items-start mb-3">
          <div className="mb-4">
            <h2 className="dashboard-title mb-1">Panel de Guardia Urbana</h2>{" "}
            <p className="dashboard-subtitle text-muted mb-0">
              Acceso a dashboards e instrumentos operativos de la Guardia
              Urbana.
            </p>
            <DashboardCard
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
            />
          </div>
          <BackButton />
        </div>
        {/* Dashboards */}
        <div className="mb-5">
          <DashboardsGrid category="Guardia Urbana" />
        </div>

        {/* Formularios */}
        <div>
          <FormsGrid category="Guardia Urbana" />
        </div>
      </div>
    </DashboardLayout>
  );
}

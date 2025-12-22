/* src/app/dashboard/looker/page.tsx */
"use client";

import DashboardsGrid from "@/components/lookers/DashboardsGrid";

export default function DashboardsPage() {
  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <div className="card mb-4">
            <div className="card-body">
              <h1 className="h3 mb-4">Tableros de Looker Studio</h1>
              <p className="text-muted">
                Administra los tableros (dashboards) de Looker Studio
                disponibles para los usuarios.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Tableros Disponibles</h5>
            </div>
            <div className="card-body">
              <DashboardsGrid />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

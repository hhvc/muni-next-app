"use client";

import { useState } from "react";
import DashboardsGrid from "@/components/lookers/DashboardsGrid";
import DashboardCreator from "@/components/lookers/DashboardCreator";

export default function DashboardsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <div className="card mb-4">
            <div className="card-body">
              <h1 className="h3 mb-4">Tableros de Looker Studio</h1>
              <p className="text-muted">
                Administra los tableros (dashborards) de Looker Studio disponibles para los
                usuarios.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8 mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Tableros Disponibles</h5>
            </div>
            <div className="card-body">
              <DashboardsGrid key={refreshKey} />
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <DashboardCreator onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );
}

// src/components/lookers/DashboardsTable.tsx

"use client";

import { LookerDashboardMetadata } from "@/types/lookerTypes";
import DashboardThumbnail from "@/components/lookers/DashboardThumbnail";

type Props = {
  dashboards: LookerDashboardMetadata[];
  canEditDashboards: boolean;
  formatDate: (date: Date | null) => string;
  onEdit: (dashboard: LookerDashboardMetadata) => void;
  onToggleStatus: (dashboard: LookerDashboardMetadata) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export default function DashboardsTable({
  dashboards,
  canEditDashboards,
  formatDate,
  onEdit,
  onToggleStatus,
  onDelete,
}: Props) {
  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-info text-white">
        <h5 className="mb-0">
          <i className="bi bi-bar-chart-line me-2"></i>
          Lista de Tableros
        </h5>
      </div>

      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Tablero</th>
                <th>Categoría</th>
                <th>Estado</th>
                <th>Creado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {dashboards.map((dashboard) => (
                <tr key={dashboard.id}>
                  <td>
                    <div className="d-flex align-items-center">
                      <DashboardThumbnail
                        title={dashboard.title}
                        thumbnailUrl={dashboard.thumbnailUrl}
                        size={40}
                      />

                      <div>
                        <strong>{dashboard.title}</strong>

                        {dashboard.description && (
                          <div className="text-muted small">
                            {dashboard.description.length > 60
                              ? `${dashboard.description.substring(0, 60)}...`
                              : dashboard.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td>
                    {dashboard.category ? (
                      <span className="badge bg-info">
                        {dashboard.category}
                      </span>
                    ) : (
                      <span className="text-muted">Sin categoría</span>
                    )}
                  </td>

                  <td>
                    {dashboard.isActive ? (
                      <span className="badge bg-success">Activo</span>
                    ) : (
                      <span className="badge bg-secondary">Inactivo</span>
                    )}
                  </td>

                  <td>
                    <small className="text-muted">
                      {formatDate(dashboard.createdAt)}
                    </small>
                  </td>

                  <td>
                    <div className="d-flex gap-2 flex-wrap">
                      <a
                        href={dashboard.embedUrl || dashboard.dashboardUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-primary"
                      >
                        Ver
                      </a>

                      {canEditDashboards && (
                        <>
                          <button
                            className="btn btn-sm btn-outline-info"
                            onClick={() => onEdit(dashboard)}
                          >
                            Editar
                          </button>

                          <button
                            className="btn btn-sm btn-outline-warning"
                            onClick={() => onToggleStatus(dashboard)}
                          >
                            {dashboard.isActive ? "Desactivar" : "Activar"}
                          </button>

                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() =>
                              dashboard.id && onDelete(dashboard.id)
                            }
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-footer themed-surface">
        <small className="text-muted">
          Mostrando {dashboards.length} tablero(s)
        </small>
      </div>
    </div>
  );
}

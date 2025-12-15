import DashboardsGrid from "@/components/lookers/DashboardsGrid";

export default function LookerDashboardsPage() {
  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-info text-white">
              <h1 className="h3 mb-0">Tableros de Looker Studio</h1>
            </div>
            <div className="card-body">
              <p className="lead">
                Accede a los tableros de Looker Studio para
                visualizar datos y métricas.
              </p>
              <DashboardsGrid />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

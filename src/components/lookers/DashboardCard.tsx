// src/components/lookers/DashboardCard.tsx
"use client";

import Link from "next/link";
import Image from "next/image";

interface DashboardCardProps {
  id?: string;
  title: string;
  description?: string;
  dashboardUrl: string; // URL del dashboard de Looker Studio
  embedUrl?: string; // URL para embed (opcional)
  thumbnailUrl?: string;
  category?: string;
  tags?: string[];
  order?: number;
  badge?: string;
  badgeColor?:
    | "primary"
    | "secondary"
    | "success"
    | "danger"
    | "warning"
    | "info";
  target?: "_self" | "_blank";
  showThumbnail?: boolean;
}

export default function DashboardCard({
  title,
  description,
  dashboardUrl,
  embedUrl,
  thumbnailUrl,
  badge,
  badgeColor = "primary",
  target = "_blank",
  showThumbnail = true,
}: DashboardCardProps) {
  const displayBadge = badge;

  const badgeColors = {
    primary: "bg-primary text-white",
    secondary: "bg-secondary text-white",
    success: "bg-success text-white",
    danger: "bg-danger text-white",
    warning: "bg-warning text-dark",
    info: "bg-info text-white",
  };

  // Usar embedUrl si está disponible, de lo contrario usar dashboardUrl
  const urlToUse = embedUrl || dashboardUrl;

  return (
    <div className="card h-100 border-0 shadow-sm hover-shadow transition-all">
      <Link
        href={urlToUse}
        target={target}
        className="text-decoration-none text-dark h-100 d-flex flex-column"
      >
        {showThumbnail && (
          <div
            className="card-img-top position-relative"
            style={{ height: "180px", overflow: "hidden" }}
          >
            {thumbnailUrl ? (
              <Image
                src={thumbnailUrl}
                alt={title}
                fill
                style={{ objectFit: "cover" }}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div
                className="w-100 h-100 d-flex align-items-center justify-content-center"
                style={{ backgroundColor: "#f8f9fa" }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="64"
                  height="64"
                  fill="#6c757d"
                  className="bi bi-bar-chart-line"
                  viewBox="0 0 16 16"
                >
                  <path d="M11 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h1V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7h1V2zm1 12h2V2h-2v12zm-3 0V7H7v7h2zm-5 0v-3H2v3h2z" />
                </svg>
              </div>
            )}
          </div>
        )}

        <div className="card-body d-flex flex-column p-4">
          {/* Header con título y badge */}
          <div className="d-flex align-items-start mb-3">
            <div className="flex-grow-1">
              <h5 className="card-title mb-1 fw-semibold">{title}</h5>
              {displayBadge && (
                <span className={`badge ${badgeColors[badgeColor]} fs-7`}>
                  {displayBadge}
                </span>
              )}
            </div>

            {/* Flecha de acceso */}
            <div className="ms-2 flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="currentColor"
                className="bi bi-box-arrow-up-right text-primary"
                viewBox="0 0 16 16"
              >
                <path
                  fillRule="evenodd"
                  d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"
                />
                <path
                  fillRule="evenodd"
                  d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"
                />
              </svg>
            </div>
          </div>

          {/* Descripción */}
          {description && (
            <p className="card-text text-muted flex-grow-1 small">
              {description}
            </p>
          )}

          {/* Footer */}
          <div className="mt-3 pt-3 border-top">
            <small className="text-primary fw-medium d-flex align-items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className="bi bi-bar-chart-line me-2"
                viewBox="0 0 16 16"
              >
                <path d="M11 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h1V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7h1V2zm1 12h2V2h-2v12zm-3 0V7H7v7h2zm-5 0v-3H2v3h2z" />
              </svg>
              Ver dashboard
            </small>
          </div>
        </div>
      </Link>

      <style jsx>{`
        .hover-shadow {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hover-shadow:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1) !important;
        }
        .transition-all {
          transition: all 0.3s ease;
        }
      `}</style>
    </div>
  );
}

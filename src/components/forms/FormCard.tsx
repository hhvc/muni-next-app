// src/components/FormCard.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";

interface FormCardProps {
  id?: string;
  title: string;
  description?: string;
  formUrl: string; // URL del formulario de Google
  iconUrl?: string;
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
}

export default function FormCard({
  title,
  description,
  formUrl,
  iconUrl,
  badge,
  badgeColor = "primary",
  target = "_blank",
}: FormCardProps) {
  // Si no se proporciona un badge, usar la categoría como badge
  const displayBadge = badge;

  // Colores para los badges
  const badgeColors = {
    primary: "bg-primary text-white",
    secondary: "bg-secondary text-white",
    success: "bg-success text-white",
    danger: "bg-danger text-white",
    warning: "bg-warning text-dark",
    info: "bg-info text-white",
  };

  return (
    <div className="card h-100 border-0 shadow-sm hover-shadow transition-all">
      <Link
        href={formUrl}
        target={target}
        className="text-decoration-none text-dark h-100 d-flex flex-column"
      >
        <div className="card-body d-flex flex-column p-4">
          {/* Header con ícono y título */}
          <div className="d-flex align-items-center mb-3">
            {/* Ícono */}
            <div className="me-3 flex-shrink-0">
              {iconUrl ? (
                <div
                  className="p-3 rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    backgroundColor: "#f8f9fa",
                    width: "60px",
                    height: "60px",
                  }}
                >
                  <Image
                    src={iconUrl}
                    alt={title}
                    width={30}
                    height={30}
                    className="img-fluid"
                  />
                </div>
              ) : (
                <div
                  className="p-3 rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    backgroundColor: "#f8f9fa",
                    width: "60px",
                    height: "60px",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="30"
                    height="30"
                    fill="currentColor"
                    className="bi bi-file-earmark-text"
                    viewBox="0 0 16 16"
                    style={{ color: "#6c757d" }}
                  >
                    <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z" />
                    <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Título y badge */}
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
                className="bi bi-arrow-right-short text-primary"
                viewBox="0 0 16 16"
              >
                <path
                  fillRule="evenodd"
                  d="M4 8a.5.5 0 0 1 .5-.5h5.793L8.146 5.354a.5.5 0 0 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5A.5.5 0 0 1 4 8z"
                />
              </svg>
            </div>
          </div>

          {/* Descripción */}
          {description && (
            <p className="card-text text-muted flex-grow-1">{description}</p>
          )}

          {/* Footer con link */}
          <div className="mt-3 pt-3 border-top">
            <small className="text-primary fw-medium">
              Acceder al formulario →
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

// Componente contenedor para organizar múltiples FormCards
interface FormGridProps {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4;
}

export function FormGrid({ children, cols = 3 }: FormGridProps) {
  const gridClasses = {
    1: "row-cols-1",
    2: "row-cols-1 row-cols-md-2",
    3: "row-cols-1 row-cols-md-2 row-cols-lg-3",
    4: "row-cols-1 row-cols-md-2 row-cols-lg-4",
  };

  return <div className={`row g-4 ${gridClasses[cols]}`}>{children}</div>;
}

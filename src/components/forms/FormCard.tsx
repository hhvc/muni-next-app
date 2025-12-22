"use client";

import Link from "next/link";
import Image from "next/image";

interface FormCardProps {
  title: string;
  description?: string;
  formUrl: string;
  iconUrl?: string;
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
  const badgeColors = {
    primary: "bg-primary",
    secondary: "bg-secondary",
    success: "bg-success",
    danger: "bg-danger",
    warning: "bg-warning text-dark",
    info: "bg-info",
  };

  return (
    <Link
      href={formUrl}
      target={target}
      className="text-decoration-none h-100"
    >
      <div className="card dashboard-card h-100 border-0 shadow-sm hover-lift">
        <div className="card-body d-flex flex-column p-4">
          {/* Header */}
          <div className="d-flex align-items-center mb-3">
            {/* Icon */}
            <div className="me-3 flex-shrink-0">
              <div className="dashboard-icon dashboard-icon-info rounded-circle">
                {iconUrl ? (
                  <Image
                    src={iconUrl}
                    alt={title}
                    width={28}
                    height={28}
                  />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    fill="currentColor"
                    className="bi bi-file-earmark-text"
                    viewBox="0 0 16 16"
                  >
                    <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z" />
                    <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0z" />
                  </svg>
                )}
              </div>
            </div>

            {/* Title + badge */}
            <div className="flex-grow-1">
              <h5 className="dashboard-card-title mb-1 fw-semibold">
                {title}
              </h5>

              {badge && (
                <span className={`badge ${badgeColors[badgeColor]}`}>
                  {badge}
                </span>
              )}
            </div>

            {/* Arrow */}
            <div className="ms-2 text-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                fill="currentColor"
                className="bi bi-arrow-right-short"
                viewBox="0 0 16 16"
              >
                <path
                  fillRule="evenodd"
                  d="M4 8a.5.5 0 0 1 .5-.5h5.793L8.146 5.354a.5.5 0 0 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5A.5.5 0 0 1 4 8z"
                />
              </svg>
            </div>
          </div>

          {/* Description */}
          {description && (
            <p className="dashboard-card-text flex-grow-1">
              {description}
            </p>
          )}

          {/* Footer */}
          <div className="mt-3 pt-3 border-top">
            <small className="text-primary fw-medium">
              Acceder al formulario →
            </small>
          </div>
        </div>
      </div>

      <style jsx>{`
        .hover-lift {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hover-lift:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </Link>
  );
}

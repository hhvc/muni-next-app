/* src/components/lookers/DashboardCard.tsx */
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface DashboardCardProps {
  id?: string;
  title: string;
  description?: string;
  dashboardUrl: string;
  embedUrl?: string;
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

/* =========================
   Utils
   ========================= */

// Convierte URLs de Google Drive a URLs directas
const convertGoogleDriveUrl = (url: string): string => {
  if (!url) return "";

  if (url.includes("uc?export=view")) return url;

  if (url.includes("drive.google.com/file/d/")) {
    const match = url.match(/\/d\/([^\/]+)/);
    if (match?.[1]) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
  }

  return url;
};

/* =========================
   Component
   ========================= */

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
  const urlToUse = embedUrl || dashboardUrl;

  const processedThumbnailUrl = thumbnailUrl
    ? convertGoogleDriveUrl(thumbnailUrl)
    : null;

  const [imageError, setImageError] = useState(false);

  const badgeColors: Record<string, string> = {
    primary: "bg-primary text-white",
    secondary: "bg-secondary text-white",
    success: "bg-success text-white",
    danger: "bg-danger text-white",
    warning: "bg-warning text-dark",
    info: "bg-info text-white",
  };

  const ThumbnailFallback = () => (
    <div className="w-100 h-100 d-flex align-items-center justify-content-center placeholder-bg">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="64"
        height="64"
        fill="currentColor"
        className="bi bi-bar-chart-line text-muted"
        viewBox="0 0 16 16"
      >
        <path d="M11 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h1V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7h1V2z" />
      </svg>
    </div>
  );

  return (
    <div className="card h-100 border-0 shadow-sm dashboard-card">
      <Link
        href={urlToUse}
        target={target}
        className="text-decoration-none h-100 d-flex flex-column"
      >
        {/* =========================
            Thumbnail
           ========================= */}
        {showThumbnail && (
          <div
            className="card-img-top position-relative"
            style={{ height: "180px", overflow: "hidden" }}
          >
            {!processedThumbnailUrl || imageError ? (
              <ThumbnailFallback />
            ) : (
              <Image
                src={processedThumbnailUrl}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw,
                       (max-width: 1200px) 50vw,
                       33vw"
                style={{ objectFit: "cover" }}
                onError={() => setImageError(true)}
              />
            )}
          </div>
        )}

        {/* =========================
            Card body
           ========================= */}
        <div className="card-body d-flex flex-column p-4">
          {/* Header */}
          <div className="d-flex align-items-start mb-3">
            <div className="flex-grow-1">
              <h5 className="dashboard-card-title mb-1 fw-semibold">{title}</h5>

              {badge && (
                <span className={`badge ${badgeColors[badgeColor]} fs-7`}>
                  {badge}
                </span>
              )}
            </div>

            <div className="ms-2 flex-shrink-0 text-muted">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="currentColor"
                className="bi bi-box-arrow-up-right"
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
            <p className="dashboard-card-text flex-grow-1 small">
              {description}
            </p>
          )}

          {/* Footer */}
          <div className="mt-3 pt-3 border-top">
            <small className="fw-medium d-flex align-items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className="bi bi-bar-chart-line me-2"
                viewBox="0 0 16 16"
              >
                <path d="M11 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h1V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7h1V2z" />
              </svg>
              Ver dashboard
            </small>
          </div>
        </div>
      </Link>
    </div>
  );
}

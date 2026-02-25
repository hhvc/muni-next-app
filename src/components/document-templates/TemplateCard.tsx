/* src/components/document-templates/TemplateCard.tsx */
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface TemplateCardProps {
  id?: string;
  title: string;
  description?: string;
  templateUrl: string;
  thumbnailUrl?: string;
  category?: string;
  creator?: string;
  tags?: string[];
  createdAt?: Date;
  fileType?: string;
  fileSize?: string;
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

// Obtener icono según tipo de archivo
const getFileIcon = (fileType?: string) => {
  if (!fileType) return "bi-file-earmark";

  const type = fileType.toLowerCase();

  if (type.includes("pdf")) return "bi-file-pdf";
  if (type.includes("word") || type.includes("doc")) return "bi-file-word";
  if (type.includes("excel") || type.includes("xls")) return "bi-file-excel";
  if (type.includes("powerpoint") || type.includes("ppt")) return "bi-file-ppt";
  if (type.includes("image")) return "bi-file-image";
  if (type.includes("zip") || type.includes("rar")) return "bi-file-zip";
  if (type.includes("text") || type.includes("txt")) return "bi-file-text";

  return "bi-file-earmark";
};

// Formatear fecha
const formatDate = (date?: Date) => {
  if (!date) return "";
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* =========================
   Component
   ========================= */

export default function TemplateCard({
  title,
  description,
  templateUrl,
  thumbnailUrl,
  creator,
  createdAt,
  fileType,
  fileSize,
  badge,
  badgeColor = "primary",
  target = "_blank",
  showThumbnail = true,
}: TemplateCardProps) {
  const processedThumbnailUrl = thumbnailUrl
    ? convertGoogleDriveUrl(thumbnailUrl)
    : null;

  const [imageError, setImageError] = useState(false);
  const fileIcon = getFileIcon(fileType);

  const badgeColors: Record<string, string> = {
    primary: "bg-primary text-white",
    secondary: "bg-secondary text-white",
    success: "bg-success text-white",
    danger: "bg-danger text-white",
    warning: "bg-warning text-dark",
    info: "bg-info text-white",
  };

  const ThumbnailFallback = () => (
    <div className="w-100 h-100 d-flex flex-column align-items-center justify-content-center placeholder-bg">
      <i
        className={`bi ${fileIcon} text-muted`}
        style={{ fontSize: "3rem" }}
      ></i>
      {fileType && (
        <span className="mt-2 small text-muted">
          {fileType.split("/").pop()?.toUpperCase()}
        </span>
      )}
    </div>
  );

  return (
    <div className="card h-100 border-0 shadow-sm document-card">
      <Link
        href={templateUrl}
        target={target}
        className="text-decoration-none h-100 d-flex flex-column"
      >
        {/* Thumbnail */}
        {showThumbnail && (
          <div
            className="card-img-top position-relative document-card-thumbnail"
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

        {/* Card body */}
        <div className="card-body d-flex flex-column p-3 document-card-body">
          {/* Header */}
          <div className="d-flex align-items-start mb-2 document-card-header">
            <div className="flex-grow-1 me-2 document-card-title-container">
              <h5 className="document-card-title mb-1 fw-semibold">{title}</h5>
            </div>

            <div className="ms-auto flex-shrink-0 text-muted document-card-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
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

          {/* Badge y metadatos */}
          <div className="mb-3 document-card-badges">
            {badge && (
              <span className={`badge ${badgeColors[badgeColor]} fs-7 me-2`}>
                {badge}
              </span>
            )}
            {fileType && (
              <span className="badge bg-light text-dark border fs-7">
                <i className={`bi ${fileIcon} me-1`}></i>
                {fileType.split("/").pop()?.toUpperCase()}
              </span>
            )}
          </div>

          {/* Descripción */}
          {description && (
            <p className="document-card-text flex-grow-1 small text-muted mb-3">
              {description.length > 120
                ? `${description.substring(0, 120)}...`
                : description}
            </p>
          )}

          {/* Footer con metadatos */}
          <div className="mt-auto pt-3 border-top document-card-footer">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                {creator && (
                  <small className="fw-medium d-flex align-items-center document-card-creator">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      fill="currentColor"
                      className="bi bi-person me-1"
                      viewBox="0 0 16 16"
                    >
                      <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4Zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10Z" />
                    </svg>
                    <span className="text-truncate d-inline-block document-card-creator-name">
                      {creator}
                    </span>
                  </small>
                )}
              </div>

              <div className="text-end">
                {createdAt && (
                  <small className="text-muted d-block document-card-date">
                    {formatDate(createdAt)}
                  </small>
                )}
                {fileSize && (
                  <small className="text-muted d-block document-card-size">
                    {fileSize}
                  </small>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

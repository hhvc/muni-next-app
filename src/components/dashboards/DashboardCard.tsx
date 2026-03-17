// src/components/dashboards/DashboardCard.tsx
"use client";

import { ReactNode } from "react";

type DashboardCardProps = {
  icon: ReactNode;
  iconVariant:
    | "purple"
    | "primary"
    | "info"
    | "success"
    | "warning"
    | "secondary"
    | "dark"
    | "red";
  title: string;
  description: string;
  action?: ReactNode;
};

// Detecta si es un icono de Bootstrap
const isBootstrapIcon = (icon: string) => icon.startsWith("bi-");

export default function DashboardCard({
  icon,
  iconVariant,
  title,
  description,
  action,
}: DashboardCardProps) {
  const renderIcon = () => {
    // Si ya es un nodo (SVG, componente, etc.), lo renderizamos directo
    if (typeof icon !== "string") {
      return icon;
    }

    // Si es Bootstrap Icon
    if (isBootstrapIcon(icon)) {
      return <i className={`bi ${icon}`}></i>;
    }

    // Si es string normal → emoji o texto
    return <span>{icon}</span>;
  };
  return (
    <div className="card h-100 shadow-sm dashboard-card transition-all hover-shadow">
      <div className="card-body text-center p-4">
        <div
          className={`dashboard-icon dashboard-icon-${iconVariant} rounded-circle mx-auto mb-3`}
        >
          <span style={{ fontSize: "1.8rem" }}>{renderIcon()}</span>{" "}
        </div>

        <h5 className="card-title dashboard-card-title mb-2">{title}</h5>

        <p className="card-text small dashboard-card-text mb-3">
          {description}
        </p>

        {action}
      </div>
    </div>
  );
}

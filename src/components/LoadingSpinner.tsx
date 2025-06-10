// src/components/LoadingSpinner.tsx
"use client"; // Aunque solo sea JSX, buena práctica si se usa en contexto cliente

import React from "react";

export default function LoadingSpinner() {
  return (
    <div className="text-center p-5">
      {/* Usa clases de Bootstrap si las tienes */}
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Cargando...</span>
      </div>
      <p>Cargando información de usuario...</p>
    </div>
  );
}

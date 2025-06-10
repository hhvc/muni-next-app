// src/components/ErrorMessage.tsx
"use client"; // ¡¡¡Importante: Declara que este es un Client Component!!!

import React from "react"; // Aunque solo uses JSX, es buena práctica importar React

// Define la interfaz para las props que recibe el componente
interface ErrorMessageProps {
  errorDetails: string; // La cadena con los detalles técnicos del error
}

// Define el componente ErrorMessage
export default function ErrorMessage({ errorDetails }: ErrorMessageProps) {
  return (
    // Usa clases de Bootstrap para estilizar el mensaje como una alerta de peligro
    <div className="alert alert-danger m-4">
      <h3>Error en la aplicación</h3>
      <p>Ocurrió un problema al cargar los datos.</p>

      {/* Muestra los detalles técnicos solo si la cadena errorDetails no está vacía */}
      {errorDetails && (
        <div className="mt-2 text-muted small">
          <p>Detalles técnicos:</p>
          {/* Envuelve los detalles técnicos en un elemento <code> para formato de código */}
          <code>{errorDetails}</code>
        </div>
      )}

      {/* Sugerencias para el usuario */}
      <div className="mt-3">
        <p>Por favor:</p>
        <ul>
          <li>Verifica tu conexión a internet</li>
          <li>Recarga la página</li>
          <li>Si el problema persiste, contacta al administrador</li>
        </ul>
      </div>
    </div>
  );
}

// src/app/page.tsx
import { Metadata } from 'next'; // Importa Metadata para definir los metadatos de la página
import HomePageContent from '@/components/HomePageContent'; // Importa el componente que maneja el renderizado condicional

// =============================================================================
// 1. Definir Metadatos (Opcional pero recomendado)
// =============================================================================
// Esta función de metadatos se ejecuta en el servidor durante el build o la petición.
// Define el título y la descripción de la página para SEO y pestañas del navegador.
export const metadata: Metadata = {
  title: 'Muni App | Inicio', // Un título más específico para esta página
  description: 'Aplicación para gestión de empleados y administración.', // Descripción adecuada
  // Puedes añadir más metadatos aquí (keywords, openGraph, twitter, etc.)
};

// =============================================================================
// 2. Componente de Página Principal (Server Component por defecto)
// =============================================================================
// Este componente se renderiza primero en el servidor. No puede usar hooks de cliente.
export default function HomePage() {
  // El Server Component simplemente renderiza el Client Component que contiene
  // la lógica de autenticación y renderizado condicional.
  // La lógica dentro de HomePageContent (uso de useAuth, useEffect, useState)
  // solo se ejecutará en el cliente después de la hidratación.
  return (
    <>
      {/* Puedes añadir aquí elementos HTML/JSX que siempre deben renderizarse
          en el servidor para esta página, como un título principal, un contenedor, etc.
          Sin embargo, para tu caso, la lógica principal está en HomePageContent. */}

      {/* Renderiza el componente que manejará la visualización basado en el estado de Auth */}
      <HomePageContent />

      {/* Puedes añadir otros elementos estáticos del servidor aquí si los necesitas */}
    </>
  );
}

// Notas:
// - No hay 'use client'; aquí, porque este es un Server Component.
// - No hay useState, useEffect, useAuth, etc., directamente en este archivo.
// - La lógica de carga, error y condicionalidad está DENTRO de HomePageContent.tsx.

// src/types/formTypes.ts
export interface FormMetadata {
  id?: string; // ID de Firestore (automático)
  title: string;
  description?: string | null;
  formUrl: string; // URL del formulario de Google
  iconUrl?: string | null; // URL de un ícono (opcional)
  category?: string | null; // Categoría del formulario
  tags?: string[] | null; // Etiquetas para filtrado
  createdBy: string; // UID del usuario que lo creó
  createdAt: Date | null;
  updatedAt: Date | null;
  isActive: boolean;
  allowedRoles?: string[] | null; // Roles que pueden ver este formulario
  order?: number; // Orden de visualización
}

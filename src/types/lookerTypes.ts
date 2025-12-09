// src/types/lookerTypes.ts

export interface LookerDashboardMetadata {
  id?: string; // ID de Firestore
  title: string;
  description?: string | null;
  dashboardUrl: string; // URL del dashboard de Looker Studio
  embedUrl?: string | null; // URL para embed (si es diferente)
  thumbnailUrl?: string | null; // URL de miniatura
  category?: string | null;
  tags?: string[] | null;
  createdBy: string; // UID del creador
  createdAt: Date | null;
  updatedAt: Date | null;
  isActive: boolean;
  allowedRoles?: string[] | null; // Roles que pueden ver este dashboard
  order?: number; // Orden de visualización
  // Campos específicos de Looker Studio
  reportId?: string | null; // ID del reporte de Looker Studio
  dataSource?: string | null; // Fuente de datos
  refreshFrequency?: string | null; // Frecuencia de actualización
  owner?: string | null; // Propietario del dashboard
}

// Si prefieres separar los tipos, puedes crear un nuevo archivo:
// src/types/lookerDashboardTypes.ts
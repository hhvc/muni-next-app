/* src/types/templateTypes.ts */
export interface TemplateMetadata {
  id: string;
  title: string;
  description?: string;
  templateUrl: string;
  thumbnailUrl?: string;
  creator: string; // Creador de la plantilla (se carga manualmente)
  createdBy: string; // Usuario que guardó (se toma automáticamente del sistema)
  createdAt: Date; // Fecha de guardado (se toma automáticamente del sistema)
  updatedAt?: Date;
  fileType?: string;
  fileSize?: string;
  category?: string;
  tags?: string[];
  isActive: boolean;
  allowedRoles?: string[];
  downloadCount?: number;
  order?: number;
}

export interface TemplateFormData {
  title: string;
  description?: string;
  templateUrl: string;
  thumbnailUrl?: string;
  creator: string;
  fileType?: string;
  fileSize?: string;
  category?: string;
  tags?: string[];
  allowedRoles?: string[];
  isActive: boolean;
  order?: number;
}

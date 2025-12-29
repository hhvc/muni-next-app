/* src/types/documentTypes.ts */
export interface DocumentMetadata {
  id: string;
  title: string;
  description?: string;
  documentUrl: string;
  thumbnailUrl?: string;
  creator: string; // Creador del documento (se carga manualmente)
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

export interface DocumentFormData {
  title: string;
  description?: string;
  documentUrl: string;
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

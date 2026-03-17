/* src/types/documentTypes.ts */
import { Timestamp } from "firebase/firestore";

export interface DocumentMetadata {
  id: string;
  title: string;
  description?: string;
  documentUrl: string;
  thumbnailUrl?: string;
  creator: string; // Creador del documento (se carga manualmente)
  createdBy: string; // Usuario que guardó (se toma automáticamente del sistema)
  createdAt: Date | Timestamp;
  updatedAt?: Date | Timestamp;
  fileType?: string;
  fileSize?: string;
  category?: string;
  tags?: string[];
  isActive: boolean;
  allowedRoles?: string[];
  downloadCount?: number;
  order?: number;
  relatedRequirementId?: string;
  relatedRequirementTitle?: string;
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
  relatedRequirementId?: string;
  relatedRequirementTitle?: string;
}

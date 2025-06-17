// src/types/employeeFormTypes.ts
import { Timestamp } from "firebase/firestore";

export interface PersonalData {
  nombre: string;
  apellido: string;
  dni: string;
  cuil: string;
  fechaNacimiento: string;
  direccion: string;
  telefono: string;
  telefonoAlternativo: string;
  mail: string;
}

export type DocumentUrlKey =
  | "dniFile"
  | "carnetConducirFile"
  | "analiticoSecundarioFile"
  | "aptoFisicoFile"
  | "buenaConductaFile"
  | "examenToxicologicoFile"
  | "deudoresAlimentariosFile"
  | "delitosIntegridadSexualFile"
  | "curriculumVitaeFile";

export type DocumentUrls = {
  [key in DocumentUrlKey]?: string;
};

export interface EmployeeData {
  personalData: PersonalData;
  documentUrls?: DocumentUrls;
  status: "draft" | "completed";
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  submittedAt?: Timestamp;
}

export interface EmployeeFormProps {
  invitationId: string;
  userId: string;
}

export type FileType = DocumentUrlKey;

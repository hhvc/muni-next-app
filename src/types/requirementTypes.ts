// src/types/requirementTypes.ts
export type RequirementType =
  | "reporte_estatico"
  | "analisis_datos"
  | "nuevo_reporte_dinamico"
  | "nuevo_formulario"
  | "otros";

export type RequirementStatus =
  | "inicial"
  | "en_revision"
  | "en_progreso"
  | "completado"
  | "rechazado";

export type Priority = "baja" | "media" | "alta" | "urgente";

export interface Requirement {
  id?: string;
  tipo: RequirementType;
  detalle: string;
  solicitante: {
    uid: string;
    email: string;
    nombre: string;
  };
  fechaCarga: Date | null;
  fechaActualizacion?: Date | null;
  estado: RequirementStatus;
  asignadoA?: {
    uid: string;
    email: string;
    nombre: string;
  } | null;
  comentarios?: string;
  prioridad?: Priority;
}

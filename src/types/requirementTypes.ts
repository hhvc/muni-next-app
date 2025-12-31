/* src/types/requirementTypes.ts */
export type RequirementType =
  | "reporte_estatico"
  | "analisis_datos"
  | "nuevo_reporte_dinamico"
  | "nuevo_formulario"
  | "otros";

export type Priority = "baja" | "media" | "alta" | "urgente" | "no_asignada";

export type RequirementStatus =
  | "inicial"
  | "en_revision"
  | "en_progreso"
  | "completado"
  | "suspendido"
  | "rechazado";

export interface Solicitante {
  uid: string;
  email: string;
  nombre: string;
}

export interface EstadoHistorial {
  estado: RequirementStatus;
  prioridad: Priority;
  fecha: Date;
  usuarioId: string;
  usuarioNombre: string;
}

export interface Asignacion {
  usuarioId: string;
  usuarioNombre: string;
  fechaAsignacion: Date;
  rol?: string;
}

// Nuevos tipos para los campos adicionales
export type DestinoPrincipal =
  | "informacion"
  | "reporte"
  | "formulario"
  | "dashboard"
  | "app"
  | "otro";

export type NaturalezaPedido =
  | "informacion_estatica"
  | "nuevo_desarrollo"
  | "correccion_errores"
  | "mejora"
  | "no_aplica";

export type AppReferencia = "rrhh" | "d_track" | "monitoreo" | "no_aplica";

export type ImportanciaUrgencia = "alta" | "media" | "baja";

export interface RequirementData {
  // Datos del solicitante (automáticos)
  solicitante: Solicitante;
  fechaCarga: Date;
  createdBy: string;

  // Tipo de Requerimiento (Nuevos campos)
  destinoPrincipal: DestinoPrincipal;
  naturalezaPedido: NaturalezaPedido;
  appReferencia?: AppReferencia; // Solo si destinoPrincipal es "app"
  dashboardReferencia?: string; // Solo si destinoPrincipal es "dashboard" - referencia al ID del dashboard
  dashboardTitulo?: string; // Título del dashboard para mostrar

  // Pedido
  tituloBreve: string;
  descripcionProblema: string;
  expectativaResolucion: string;

  // Prioridad
  importancia: ImportanciaUrgencia;
  urgencia: ImportanciaUrgencia;
  fechaLimite?: Date;

  // Detalles adicionales
  usuariosQueUsaran?: string;
  datosFuentesNecesarios?: string;
  metricasKPI?: string;
  observaciones?: string;

  // Sistema de seguimiento (parcialmente automático)
  estado: RequirementStatus;
  prioridad: Priority; // "no_asignada" inicialmente, luego se asigna manualmente
  asignadoA: Asignacion[];
  comentarios?: string;

  // Historial de estados
  historialEstados: EstadoHistorial[];

  // Campos originales (mantenidos para compatibilidad)
  tipo?: RequirementType;
  detalle?: string;

  // Metadatos
  updatedAt?: Date;
  isActive: boolean;
}

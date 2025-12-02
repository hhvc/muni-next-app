// src/utils/firestoreHelpers.ts

/**
 * Tipo para valores válidos en Firestore
 * Firestore no acepta undefined, pero sí null y otros tipos
 */
export type FirestoreValue =
  | string
  | number
  | boolean
  | null
  | Date
  | FirebaseFirestore.Timestamp
  | FirebaseFirestore.FieldValue
  | FirestoreValue[]
  | { [key: string]: FirestoreValue };

/**
 * Remueve propiedades con valor undefined de un objeto
 * Firestore no acepta undefined, así que debemos eliminarlos
 */
export const removeUndefined = <T extends Record<string, unknown>>(
  obj: T
): Partial<T> => {
  const result: Partial<T> = {};

  (Object.keys(obj) as Array<keyof T>).forEach((key) => {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  });

  return result;
};

/**
 * Prepara un objeto para ser guardado en Firestore
 * - Elimina propiedades undefined
 * - Convierte arrays vacíos a null (opcional)
 * - Mantiene null y otros valores válidos
 */
export const prepareForFirestore = <T extends Record<string, unknown>>(
  data: T
): Record<string, unknown> => {
  const cleaned: Record<string, unknown> = {};

  Object.entries(data).forEach(([key, value]) => {
    // Eliminar undefined
    if (value === undefined) {
      return;
    }

    // Si es array, verificar si está vacío y convertirlo a null si es necesario
    if (Array.isArray(value) && value.length === 0) {
      cleaned[key] = null;
      return;
    }

    // Si es objeto y no es null, limpiarlo recursivamente
    if (
      typeof value === "object" &&
      value !== null &&
      !(value instanceof Date)
    ) {
      // No limpiar recursivamente si es Timestamp o FieldValue
      if ("toDate" in value || "isEqual" in value) {
        // Es un Timestamp de Firestore
        cleaned[key] = value;
      } else if ("_methodName" in value) {
        // Es un FieldValue de Firestore
        cleaned[key] = value;
      } else {
        // Limpiar objeto normal recursivamente
        cleaned[key] = prepareForFirestore(value as Record<string, unknown>);
      }
      return;
    }

    // Para otros valores (string, number, boolean, null, Date)
    cleaned[key] = value;
  });

  return cleaned;
};

/**
 * Helper específico para datos de formularios
 * Maneja los campos comunes de formularios
 */
export const prepareFormData = (data: {
  title: string;
  formUrl: string;
  createdBy: string;
  description?: string;
  iconUrl?: string;
  category?: string;
  tags?: string[];
  allowedRoles?: string[];
  isActive?: boolean;
  order?: number;
}): Record<string, unknown> => {
  return prepareForFirestore({
    ...data,
    // Asegurar valores por defecto
    isActive: data.isActive ?? true,
    order: data.order ?? 0,
    // Convertir campos opcionales vacíos a null
    description: data.description || null,
    iconUrl: data.iconUrl || null,
    category: data.category || null,
    tags: data.tags || null,
    allowedRoles: data.allowedRoles || null,
  });
};

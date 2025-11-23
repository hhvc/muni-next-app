// src/utils/logger.ts
const isDevelopment = process.env.NODE_ENV === "development";

// Tipo más flexible que permite arrays y más tipos
type Loggable =
  | string
  | number
  | boolean
  | null
  | undefined
  | object
  | Error
  | Array<Loggable>
  | Date
  | RegExp;

// Helper para convertir cualquier valor a algo loggeable
const toLoggable = (value: unknown): Loggable => {
  if (value === null || value === undefined) {
    return value;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value instanceof Error ||
    value instanceof Date ||
    value instanceof RegExp
  ) {
    return value as Loggable;
  }

  if (Array.isArray(value)) {
    return value.map(toLoggable) as Loggable[];
  }

  if (typeof value === "object") {
    try {
      // Para objetos, intentamos convertirlos de forma segura
      return JSON.parse(JSON.stringify(value)) as object;
    } catch {
      return "[Object]";
    }
  }

  return String(value);
};

export const logger = {
  log: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.log(...args.map(toLoggable));
    }
  },

  info: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.info("ℹ️", ...args.map(toLoggable));
    }
  },

  warn: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.warn("⚠️", ...args.map(toLoggable));
    } else {
      console.warn(...args.map(toLoggable));
    }
  },

  error: (...args: unknown[]): void => {
    console.error("❌", ...args.map(toLoggable));
  },

  success: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.log("✅", ...args.map(toLoggable));
    }
  },

  debug: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.debug("🐛", ...args.map(toLoggable));
    }
  },

  // Método para logging de objetos complejos
  object: (label: string, obj: unknown): void => {
    if (isDevelopment) {
      console.log(`🔍 ${label}:`, toLoggable(obj));
    }
  },
};

export default logger;

export const APP_CONFIG = {
  maxLoginAttempts: 5,
  sessionTimeout: 30 * 60 * 1000, // 30 minutos
  cacheDurations: {
    user: 5 * 60 * 1000, // 5 minutos
    permissions: 2 * 60 * 1000, // 2 minutos
  },
  roles: {
    admin: "admin",
    hr: "hr",
    collaborator: "collaborator",
    pending: "pending_verification",
  } as const,
};

export const FIREBASE_ERRORS = {
  "permission-denied": "No tienes permisos para realizar esta acción",
  unauthenticated: "Debes iniciar sesión para continuar",
  "not-found": "El recurso solicitado no existe",
} as const;

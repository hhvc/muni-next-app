// src/lib/constants.ts
export const APP_CONFIG = {
  maxLoginAttempts: 5,
  sessionTimeout: 30 * 60 * 1000, // 30 minutos
  cacheDurations: {
    user: 5 * 60 * 1000, // 5 minutos
    permissions: 2 * 60 * 1000, // 2 minutos
  },
  // Sistema de roles actualizado para soportar arrays
  roles: {
    // Roles individuales (mantenidos para compatibilidad)
    admin: "admin",
    hr: "hr",
    collaborator: "collaborator",
    data: "data",
    root: "root",
    pending: "pending_verification",
    nuevo: "nuevo",
    
    // Grupos de roles para permisos
    roleGroups: {
      administrators: ["root", "admin"],
      management: ["root", "admin", "hr"],
      dataAccess: ["root", "admin", "hr", "data"],
      allEmployees: ["root", "admin", "hr", "data", "collaborator"]
    } as const,
    
    // Jerarquía de roles para determinar rol principal
    hierarchy: {
      root: 100,
      admin: 90,
      hr: 80,
      data: 70,
      collaborator: 60,
      pending_verification: 10,
      nuevo: 5
    } as const,
    
    // Permisos por rol (opcional, para lógica de permisos granular)
    permissions: {
      root: ["*"], // Acceso total
      admin: ["manage_users", "manage_employees", "view_reports", "manage_invitations"],
      hr: ["manage_employees", "view_reports", "manage_invitations"],
      data: ["view_reports", "export_data"],
      collaborator: ["view_own_data", "update_own_profile"],
      pending_verification: ["view_own_profile"],
      nuevo: ["view_own_profile"]
    } as const
  } as const,
  
  // Rutas de dashboard por rol (para compatibilidad)
  dashboardRoutes: {
    root: "/dashboard/root",
    admin: "/dashboard/admin", 
    hr: "/dashboard/hr",
    data: "/dashboard/data",
    collaborator: "/dashboard/collaborator",
    default: "/dashboard/root"
  } as const
};

export const FIREBASE_ERRORS = {
  "permission-denied": "No tienes permisos para realizar esta acción",
  unauthenticated: "Debes iniciar sesión para continuar",
  "not-found": "El recurso solicitado no existe",
} as const;

// Helper functions para el nuevo sistema de roles
export const RoleHelpers = {
  // Obtener el rol principal basado en jerarquía
  getPrimaryRole: (roles: string[]): string => {
    if (!roles || roles.length === 0) return "pending_verification";
    
    let highestRole = roles[0];
    let highestPriority = APP_CONFIG.roles.hierarchy[highestRole as keyof typeof APP_CONFIG.roles.hierarchy] || 0;
    
    for (const role of roles) {
      const priority = APP_CONFIG.roles.hierarchy[role as keyof typeof APP_CONFIG.roles.hierarchy] || 0;
      if (priority > highestPriority) {
        highestRole = role;
        highestPriority = priority;
      }
    }
    
    return highestRole;
  },
  
  // Verificar si usuario tiene un rol específico
  hasRole: (userRoles: string[], targetRole: string): boolean => {
    return userRoles.includes(targetRole);
  },
  
  // Verificar si usuario tiene alguno de los roles especificados
  hasAnyRole: (userRoles: string[], targetRoles: string[]): boolean => {
    return targetRoles.some(role => userRoles.includes(role));
  },
  
  // Verificar si usuario tiene todos los roles especificados
  hasAllRoles: (userRoles: string[], targetRoles: string[]): boolean => {
    return targetRoles.every(role => userRoles.includes(role));
  },
  
  // Verificar si usuario pertenece a un grupo de roles
  hasRoleGroup: (userRoles: string[], roleGroup: keyof typeof APP_CONFIG.roles.roleGroups): boolean => {
    const groupRoles = APP_CONFIG.roles.roleGroups[roleGroup];
    return groupRoles.some(role => userRoles.includes(role));
  },
  
  // Obtener ruta de dashboard basada en roles
  getDashboardRoute: (userRoles: string[]): string => {
    const primaryRole = RoleHelpers.getPrimaryRole(userRoles);
    return APP_CONFIG.dashboardRoutes[primaryRole as keyof typeof APP_CONFIG.dashboardRoutes] || 
           APP_CONFIG.dashboardRoutes.default;
  }
};
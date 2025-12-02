// src/components/AuthProvider.tsx

"use client";

import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import {
  User,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, onSnapshot, DocumentData, Timestamp } from "firebase/firestore";
import { auth, db } from "@/firebase/clientApp";
import {
  createPlatformUser,
  updateUserLastLogin,
} from "@/services/userService";
import { RoleHelpers } from "@/lib/constants";

interface AuthContextType {
  user: User | null;
  userRole: string | null;
  userRoles: string[] | null;
  loadingUserStatus: boolean;
  hasError: boolean;
  errorDetails: string;
  reloadUserData: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Interfaz para los datos de usuario de Firestore - CORREGIDA: sin any
interface FirestoreUserData {
  role?: string;
  roles?: string[];
  primaryRole?: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  dni?: string;
  invitationCode?: string;
  invitationDocId?: string;
  createdAt?: Timestamp | null;
  lastLoginAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  loginHistory?: Timestamp[] | null;
  isActive?: boolean;
  userType?: "platform" | "candidate";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[] | null>(null);
  const [loadingUserStatus, setLoadingUserStatus] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorDetails, setErrorDetails] = useState<string>("");
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const isUpdatingLoginRef = useRef(false);
  const lastLoginUpdateRef = useRef<number>(0);

  const reloadUserData = useCallback(async () => {
    setReloadTrigger((prev) => prev + 1);
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    if (!auth) {
      console.error("No se puede cerrar sesión: auth no está disponible");
      throw new Error("Auth no está disponible");
    }

    try {
      await firebaseSignOut(auth);
      console.log("Sesión cerrada exitosamente");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      throw error;
    }
  }, []);

  // Helper para procesar datos de usuario desde Firestore - COMPLETAMENTE TIPADO
  const processUserData = useCallback(
    (userData: FirestoreUserData | DocumentData) => {
      // Convertir a FirestoreUserData para tener tipos seguros
      const data = userData as FirestoreUserData;

      let roles: string[];
      let primaryRole: string;

      if (data.roles && Array.isArray(data.roles)) {
        roles = data.roles;
        primaryRole = data.primaryRole || RoleHelpers.getPrimaryRole(roles);
      } else if (data.role) {
        roles = [data.role];
        primaryRole = data.role;
      } else {
        roles = ["pending_verification"];
        primaryRole = "pending_verification";
      }

      return { roles, primaryRole };
    },
    []
  );

  // Listener de autenticación y datos de usuario
  useEffect(() => {
    if (typeof window === "undefined" || !auth || !db) {
      setLoadingUserStatus(false);
      setHasError(true);
      setErrorDetails("Firebase no está inicializado correctamente");
      return;
    }

    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setUserRole(null);
      setUserRoles(null);
      setLoadingUserStatus(true);
      setHasError(false);
      setErrorDetails("");

      isUpdatingLoginRef.current = false;
      lastLoginUpdateRef.current = 0;

      if (!firebaseUser) {
        setLoadingUserStatus(false);
        return;
      }

      try {
        const userDocRef = doc(db, "users", firebaseUser.uid);

        const docUnsubscribe = onSnapshot(
          userDocRef,
          async (userDocSnap) => {
            try {
              if (userDocSnap.exists()) {
                const userData = userDocSnap.data() as FirestoreUserData;

                const { roles, primaryRole } = processUserData(userData);

                setUserRoles(roles);
                setUserRole(primaryRole);

                console.log("🔄 Datos de usuario procesados:", {
                  uid: firebaseUser.uid,
                  roles,
                  primaryRole,
                });

                const now = Date.now();
                const timeSinceLastUpdate = now - lastLoginUpdateRef.current;

                if (
                  !isUpdatingLoginRef.current &&
                  (timeSinceLastUpdate > 30000 ||
                    lastLoginUpdateRef.current === 0)
                ) {
                  isUpdatingLoginRef.current = true;
                  lastLoginUpdateRef.current = now;

                  console.log(
                    "🔄 Actualizando último login para usuario existente:",
                    firebaseUser.uid
                  );
                  await updateUserLastLogin(firebaseUser.uid);

                  setTimeout(() => {
                    isUpdatingLoginRef.current = false;
                  }, 1000);
                }
              } else {
                console.log(
                  "🔹 Usuario sin documento en Firestore, creando..."
                );
                await createPlatformUser(firebaseUser);

                setUserRoles(["pending_verification"]);
                setUserRole("pending_verification");
              }
              setHasError(false);
            } catch (snapshotError) {
              console.error("❌ Error procesando snapshot:", snapshotError);
              setHasError(true);
              setErrorDetails(
                snapshotError instanceof Error
                  ? snapshotError.message
                  : "Error desconocido procesando datos de usuario"
              );
            } finally {
              setLoadingUserStatus(false);
            }
          },
          (error) => {
            console.error("❌ Error en listener de Firestore:", error);
            setHasError(true);
            setErrorDetails(
              `Firestore error: ${error.code} - ${error.message}`
            );
            setLoadingUserStatus(false);
          }
        );

        return () => docUnsubscribe();
      } catch (error) {
        console.error("❌ Error general en AuthProvider:", error);
        setHasError(true);
        setErrorDetails(
          error instanceof Error
            ? error.message
            : "Error desconocido inicializando listener"
        );
        setLoadingUserStatus(false);
      }
    });

    return () => authUnsubscribe();
  }, [reloadTrigger, processUserData]);

  const contextValue: AuthContextType = {
    user,
    userRole,
    userRoles,
    loadingUserStatus,
    hasError,
    errorDetails,
    reloadUserData,
    signOut,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

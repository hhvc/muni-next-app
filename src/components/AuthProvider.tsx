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
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/firebase/clientApp";
import {
  createPlatformUser,
  updateUserLastLogin,
} from "@/services/userService";

interface AuthContextType {
  user: User | null;
  userRole: string | null;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingUserStatus, setLoadingUserStatus] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorDetails, setErrorDetails] = useState<string>("");
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // ⭐ NUEVO: Referencia para controlar el bucle
  const isUpdatingLoginRef = useRef(false);
  const lastLoginUpdateRef = useRef<number>(0);

  // Función para recargar datos de usuario
  const reloadUserData = useCallback(async () => {
    setReloadTrigger((prev) => prev + 1);
  }, []);

  // ✅ Función para cerrar sesión - CORREGIDA
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
      setLoadingUserStatus(true);
      setHasError(false);
      setErrorDetails("");

      // ⭐ NUEVO: Resetear flags cuando cambia el usuario
      isUpdatingLoginRef.current = false;
      lastLoginUpdateRef.current = 0;

      if (!firebaseUser) {
        setLoadingUserStatus(false);
        return;
      }

      try {
        const userDocRef = doc(db, "users", firebaseUser.uid);

        // Usamos onSnapshot para escuchar cambios en tiempo real
        const docUnsubscribe = onSnapshot(
          userDocRef,
          async (userDocSnap) => {
            try {
              if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                const role = userData?.role || null;
                setUserRole(role);

                // ⭐ CORREGIDO: Prevenir bucle infinito
                const now = Date.now();
                const timeSinceLastUpdate = now - lastLoginUpdateRef.current;

                // Solo actualizar último login si:
                // 1. No estamos ya en medio de una actualización
                // 2. Ha pasado al menos 30 segundos desde la última actualización
                // 3. O es la primera vez que detectamos el usuario
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

                  // Permitir nuevas actualizaciones después de un breve delay
                  setTimeout(() => {
                    isUpdatingLoginRef.current = false;
                  }, 1000);
                }
              } else {
                // ⭐ NUEVO: Si no existe el documento, crear usuario de plataforma
                console.log(
                  "🔹 Usuario sin documento en Firestore, creando..."
                );
                await createPlatformUser(firebaseUser);
                setUserRole("nuevo");
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
  }, [reloadTrigger]); // Recargar cuando cambie el trigger

  const contextValue: AuthContextType = {
    user,
    userRole,
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

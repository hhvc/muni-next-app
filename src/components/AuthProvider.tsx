"use client";

import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/firebase/clientApp";

interface AuthContextType {
  user: User | null;
  userRole: string | null;
  loadingUserStatus: boolean;
  hasError: boolean;
  errorDetails: string;
  reloadUserData: () => Promise<void>;
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

  // Función para recargar datos de usuario
  const reloadUserData = useCallback(async () => {
    setReloadTrigger((prev) => prev + 1);
  }, []);

  // Listener de autenticación y datos de usuario
  useEffect(() => {
    if (typeof window === "undefined" || !auth || !db) {
      return;
    }

    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setUserRole(null);
      setLoadingUserStatus(true);
      setHasError(false);
      setErrorDetails("");

      if (!firebaseUser) {
        setLoadingUserStatus(false);
        return;
      }

      try {
        const userDocRef = doc(db, "users", firebaseUser.uid);

        // Usamos onSnapshot para escuchar cambios en tiempo real
        const docUnsubscribe = onSnapshot(
          userDocRef,
          (userDocSnap) => {
            try {
              if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                const role = userData?.role || null;
                setUserRole(role);
              } else {
                setUserRole(null);
              }
              setHasError(false);
            } catch (snapshotError) {
              console.error("Error procesando snapshot:", snapshotError);
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
            console.error("Error en listener de Firestore:", error);
            setHasError(true);
            setErrorDetails(
              `Firestore error: ${error.code} - ${error.message}`
            );
            setLoadingUserStatus(false);
          }
        );

        return () => docUnsubscribe();
      } catch (error) {
        console.error("Error general en AuthProvider:", error);
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
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

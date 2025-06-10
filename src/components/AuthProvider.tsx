// src/components/AuthProvider.tsx
"use client";

import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import { User } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { auth, db } from "@/firebase/clientApp";

interface AuthContextType {
  user: User | null;
  userRole: string | null;
  needsInvitationCode: boolean;
  loadingUserStatus: boolean;
  hasError: boolean;
  errorDetails: string;
  isOnline: boolean;
  setNeedsInvitationCode: (value: boolean) => void;
  reloadUserData: () => void; // Nueva función para recargar datos
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
  const [needsInvitationCode, setNeedsInvitationCode] =
    useState<boolean>(false);
  const [loadingUserStatus, setLoadingUserStatus] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorDetails, setErrorDetails] = useState<string>("");
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  // Función para recargar datos de usuario
  const reloadUserData = useCallback(async () => {
    if (user && isOnline) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setUserRole(userData?.role || "invitado");
          setNeedsInvitationCode(
            !["RRHH Admin", "Admin Principal"].includes(userData?.role)
          );
        }
      } catch (error) {
        console.error("Error reloading user data:", error);
      }
    }
  }, [user, isOnline]);

  // Manejo de conexión
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  // Listener de autenticación y datos de usuario
  useEffect(() => {
    if (typeof window !== "undefined") {
      const authUnsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
        setUser(firebaseUser);
        setLoadingUserStatus(true);
        setHasError(false);
        setErrorDetails("");

        if (!isOnline) {
          console.warn("Modo offline activado");
          setUserRole("offline");
          setNeedsInvitationCode(false);
          setLoadingUserStatus(false);
          return;
        }

        if (!firebaseUser) {
          setUserRole(null);
          setNeedsInvitationCode(false);
          setLoadingUserStatus(false);
          return;
        }

        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);

          // Usamos un listener en tiempo real en lugar de getDoc
          const docUnsubscribe = onSnapshot(
            userDocRef,
            (userDocSnap) => {
              if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                const role = userData?.role || "invitado";
                setUserRole(role);
                setNeedsInvitationCode(
                  !["RRHH Admin", "Admin Principal"].includes(role)
                );
              } else {
                // 1. No creamos el documento automáticamente
                // 2. Marcamos que necesita validación
                setUserRole(null);
                setNeedsInvitationCode(true);
              }
              setLoadingUserStatus(false);
            },
            (error) => {
              console.error("Error en listener de Firestore:", error);
              setLoadingUserStatus(false);
            }
          );

          return () => docUnsubscribe();
        } catch (error) {
          console.error("Error general en AuthProvider:", error);
          setLoadingUserStatus(false);
        }
      });

      return () => authUnsubscribe();
    }
  }, [isOnline]);

  const contextValue: AuthContextType = {
    user,
    userRole,
    needsInvitationCode,
    loadingUserStatus,
    hasError,
    errorDetails,
    isOnline,
    setNeedsInvitationCode,
    reloadUserData, // Expone la función de recarga
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

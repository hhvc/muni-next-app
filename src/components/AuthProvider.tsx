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
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  FirestoreError,
  Firestore,
} from "firebase/firestore";
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
  reloadUserData: () => void;
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
  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(false);

  // Función optimizada para verificar inicialización
  const checkInitialization = () => !!db && !!auth;

  // Verificar inicialización de Firebase
  useEffect(() => {
    if (checkInitialization()) {
      setIsFirebaseInitialized(true);
      return;
    }

    const intervalId = setInterval(() => {
      if (checkInitialization()) {
        setIsFirebaseInitialized(true);
        clearInterval(intervalId);
        clearTimeout(timeoutId);
      }
    }, 500);

    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      if (!checkInitialization()) {
        console.error("🚨 Firebase no se inicializó en 10 segundos");
        setHasError(true);
        setErrorDetails("Firebase no se pudo inicializar");
      }
    }, 10000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, []);

  // Función para recargar datos de usuario
  const reloadUserData = useCallback(async () => {
    if (!user || !isOnline || !isFirebaseInitialized || !db) return;

    try {
      setLoadingUserStatus(true);
      // SOLUCIÓN: Usar aserción de tipo no nulo
      const dbInstance = db as Firestore;
      const userDocRef = doc(dbInstance, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const role = userData?.role || null;
        setUserRole(role);
        setNeedsInvitationCode(
          !["RRHH Admin", "Admin Principal"].includes(role || "")
        );
      } else {
        setUserRole(null);
        setNeedsInvitationCode(true);
      }
    } catch (error) {
      console.error("❌ Error reloading user data:", error);
      if (error instanceof FirebaseError) {
        setErrorDetails(`Firebase error: ${error.code} - ${error.message}`);
      } else {
        setErrorDetails("Unknown error reloading user data");
      }
      setHasError(true);
    } finally {
      setLoadingUserStatus(false);
    }
  }, [user, isOnline, isFirebaseInitialized]);

  // Manejo de conexión
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Prueba de conexión
  const testConnection = useCallback(async () => {
    if (!isFirebaseInitialized || !db) return;

    try {
      // SOLUCIÓN: Usar aserción de tipo no nulo
      const dbInstance = db as Firestore;
      const testDocRef = doc(dbInstance, "_test", "connection");
      await setDoc(testDocRef, {
        timestamp: new Date(),
        message: "Prueba de conexión desde AuthProvider",
      });
    } catch (error) {
      console.error("❌ Prueba de conexión fallida:", error);
    }
  }, [isFirebaseInitialized]);

  // Ejecutar prueba de conexión
  useEffect(() => {
    if (isOnline && isFirebaseInitialized) {
      testConnection();
    }
  }, [isOnline, isFirebaseInitialized, testConnection]);

  // Listener de autenticación y datos de usuario
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !isFirebaseInitialized ||
      !auth ||
      !db
    ) {
      return;
    }

    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setUserRole(null);
      setNeedsInvitationCode(false);
      setLoadingUserStatus(true);
      setHasError(false);
      setErrorDetails("");

      if (!firebaseUser) {
        setLoadingUserStatus(false);
        return;
      }

      if (!isOnline) {
        setUserRole("offline");
        setLoadingUserStatus(false);
        return;
      }

      try {
        // SOLUCIÓN: Usar aserción de tipo no nulo
        const dbInstance = db as Firestore;
        const userDocRef = doc(dbInstance, "users", firebaseUser.uid);
        const docUnsubscribe = onSnapshot(
          userDocRef,
          (userDocSnap) => {
            try {
              if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                const role = userData?.role || null;
                setUserRole(role);
                setNeedsInvitationCode(
                  !["RRHH Admin", "Admin Principal"].includes(role || "")
                );
              } else {
                setUserRole(null);
                setNeedsInvitationCode(true);
              }
            } catch (snapshotError) {
              console.error("❌ Error procesando snapshot:", snapshotError);
              setHasError(true);
              if (snapshotError instanceof FirebaseError) {
                setErrorDetails(
                  `Firestore error: ${snapshotError.code} - ${snapshotError.message}`
                );
              } else {
                setErrorDetails(
                  "Error desconocido procesando datos de usuario"
                );
              }
            } finally {
              setLoadingUserStatus(false);
            }
          },
          (error: FirestoreError) => {
            console.error("🔥 Error en listener de Firestore:", error);
            setHasError(true);
            setErrorDetails(`Firebase error: ${error.code} - ${error.message}`);
            setLoadingUserStatus(false);
          }
        );

        return () => docUnsubscribe();
      } catch (error) {
        console.error("❌ Error general en AuthProvider:", error);
        setHasError(true);
        if (error instanceof FirebaseError) {
          setErrorDetails(`Firebase error: ${error.code} - ${error.message}`);
        } else {
          setErrorDetails("Error desconocido inicializando listener");
        }
        setLoadingUserStatus(false);
      }
    });

    return () => authUnsubscribe();
  }, [isOnline, isFirebaseInitialized]);

  const contextValue: AuthContextType = {
    user,
    userRole,
    needsInvitationCode,
    loadingUserStatus,
    hasError,
    errorDetails,
    isOnline,
    setNeedsInvitationCode,
    reloadUserData,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

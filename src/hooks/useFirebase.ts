// src/hooks/useFirebase.ts
import { useEffect, useRef, useState } from "react";
import { Firestore } from "firebase/firestore";
import { db } from "@/firebase/clientApp";

interface FirebaseHookResult {
  db: Firestore | null;
  isInitialized: boolean;
  error: string | null;
}

const useFirebase = (): FirebaseHookResult => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // Función para verificar la inicialización
    const checkInitialization = (): boolean => {
      try {
        return !!db;
      } catch (e) {
        console.error("Firebase initialization check error:", e);
        return false;
      }
    };

    // Intento de verificación inmediata
    if (checkInitialization()) {
      setIsInitialized(true);
      return;
    }

    // Configurar verificación periódica
    const intervalId = setInterval(() => {
      if (checkInitialization() && isMountedRef.current) {
        setIsInitialized(true);
        clearInterval(intervalId);
        clearTimeout(timeoutId);
      }
    }, 500);

    // Configurar timeout para manejar casos de fallo
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current && !checkInitialization()) {
        setError("Firebase no se inicializó en el tiempo esperado");
        clearInterval(intervalId);
      }
    }, 10000);

    // Limpieza al desmontar
    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, []); // Dependencias vacías - solo se ejecuta al montar

  return {
    db: isInitialized ? db : null,
    isInitialized,
    error,
  };
};

export default useFirebase;

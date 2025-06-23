// src/hooks/useAuth.ts
import { useEffect, useState } from "react";
// Importa solo las funciones específicas que necesitas del SDK de Cliente
import { getAuth, onAuthStateChanged, User } from "firebase/auth"; // Importa 'User' para tipado
import { getFirestore, doc, getDoc } from "firebase/firestore"; // Importa funciones de Firestore

// Opcional: Importa la instancia de la app Firebase si la necesitas para getAuth/getFirestore
// import { app } from "@/firebase/clientApp"; // Asegúrate de que app se exporte desde clientApp

interface AuthState {
  user: User | null; // El objeto User de Firebase Auth o null
  userRole: string | null; // El rol del usuario leído de Firestore o null
  loading: boolean; // Indica si el estado de autenticación/rol está cargando inicialmente
  error: Error | null; // Cualquier error que ocurra durante la carga del estado
  reloadUserData: () => Promise<void>; // Función para forzar la recarga del documento de usuario y el rol
}

// Definimos una interfaz para la estructura esperada del documento de usuario en Firestore
interface UserDocumentData {
  role?: string; // Asumimos que el rol es un string y es opcional
  // Puedes añadir aquí otras propiedades que esperes leer del documento de usuario
  // Por ejemplo: dni?: string; employeeDataCompleted?: boolean;
}

export const useAuth = (): AuthState => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // Empezamos en loading: true
  const [error, setError] = useState<Error | null>(null);

  // Estado local para forzar la recarga de datos del documento de usuario
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    // Obtén las instancias de Auth y Firestore.
    // Si clientApp.ts exporta 'app', puedes pasársela a estas funciones:
    // const authInstance = getAuth(app);
    // const dbInstance = getFirestore(app);
    const authInstance = getAuth(); // Usa la instancia por defecto si solo se inicializa una app
    const dbInstance = getFirestore(); // Usa la instancia por defecto

    console.log("useAuth: useEffect se inicia. reloadTrigger:", reloadTrigger); // DEBUG

    // Suscríbete a los cambios en el estado de autenticación de Firebase Auth
    const unsubscribe = onAuthStateChanged(
      authInstance,
      async (authenticatedUser) => {
        console.log("useAuth: onAuthStateChanged callback disparado."); // DEBUG
        setLoading(true);
        setError(null); // Limpiamos errores previos

        let determinedRole: string | null = null; // Variable local para el rol determinado

        try {
          if (authenticatedUser) {
            // Si hay un usuario autenticado, lo almacenamos
            console.log(
              "useAuth: Usuario autenticado, UID:",
              authenticatedUser.uid
            ); // DEBUG
            setUser(authenticatedUser);

            // Cargar datos adicionales del documento de usuario desde Firestore
            const userDocRef = doc(dbInstance, "users", authenticatedUser.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
              const userData = userDocSnap.data() as UserDocumentData; // Casteamos los datos al tipo esperado
              console.log(
                "useAuth: Datos del documento de usuario Firestore:",
                userData
              ); // DEBUG
              console.log("useAuth: Rol leído de Firestore:", userData.role); // DEBUG
              determinedRole = userData.role || null; // Asignamos a la variable local
              setUserRole(determinedRole); // Almacenamos el rol
            } else {
              // Si el usuario Auth existe pero NO tiene documento en 'users', su rol es null/indefinido
              determinedRole = null; // Asignamos a la variable local
              setUserRole(null); // O podrías establecer un rol por defecto como 'unregistered'
              console.log(
                `useAuth: Usuario ${authenticatedUser.uid} autenticado pero sin documento en Firestore 'users'.`
              ); // DEBUG
            }
          } else {
            // Si no hay usuario (logout), limpiamos el estado
            console.log("useAuth: Usuario deslogueado."); // DEBUG
            setUser(null);
            determinedRole = null; // Asignamos a la variable local
            setUserRole(null);
          }
        } catch (err: unknown) {
          console.error("useAuth: Error fetching user document:", err); // DEBUG
          setError(
            err instanceof Error ? err : new Error("An unknown error occurred.")
          ); // Almacenamos cualquier error
          determinedRole = null; // Asignamos a la variable local
          setUserRole(null);
        } finally {
          // Finalizamos el estado de carga después de procesar el usuario y su documento
          setLoading(false);
          // Usamos la variable local 'determinedRole' aquí
          console.log(
            "useAuth: Carga de autenticación y rol finalizada. user:",
            authenticatedUser?.uid,
            "userRole (final):",
            determinedRole
          ); // DEBUG
        }
      }
    );

    // Función de limpieza: se ejecuta cuando el componente que usa el hook se desmonta
    // o antes de que el effect se re-ejecute (ej: por un cambio en reloadTrigger).
    // Esto desuscribe el listener de autenticación para evitar fugas de memoria.
    return () => {
      console.log("useAuth: Desuscribiendo onAuthStateChanged."); // DEBUG
      unsubscribe();
    };

    // Dependencias del Effect:
    // Este effect debe re-ejecutarse si `reloadTrigger` cambia, para forzar una recarga.
    // No necesita depender de `user`, `userRole`, `loading`, `error` porque estos son estados
    // que este mismo effect actualiza.
    // No necesita depender de `authInstance` o `dbInstance` si estas instancias
    // son constantes (obtenidas una vez de clientApp) o si getAuth/getFirestore
    // siempre devuelven la misma instancia para la app por defecto.
  }, [reloadTrigger]); // Dependencia en reloadTrigger para forzar re-fetch

  // Función para forzar la recarga del documento de usuario y el rol
  const reloadUserData = async () => {
    console.log("useAuth: Forzando recarga de datos del usuario y rol."); // DEBUG
    // Incrementamos el estado local reloadTrigger. Esto hará que el useEffect
    // se re-ejecute, lo que disparará el fetch del documento de usuario de nuevo.
    setReloadTrigger((prev) => prev + 1);
  };

  // Exportar el estado y las funciones/datos que necesiten los componentes que usen este hook
  return {
    user, // Objeto User de Auth (uid, email, displayName, etc.)
    userRole, // Rol leído del documento de usuario en Firestore
    loading, // Estado de carga
    error, // Cualquier error
    reloadUserData, // Exponemos la función para recargar datos
  };
};

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

    // Suscríbete a los cambios en el estado de autenticación de Firebase Auth
    const unsubscribe = onAuthStateChanged(
      authInstance,
      async (authenticatedUser) => {
        // Al recibir un cambio (login, logout), iniciamos el estado de carga
        setLoading(true);
        setError(null); // Limpiamos errores previos

        try {
          if (authenticatedUser) {
            // Si hay un usuario autenticado, lo almacenamos
            setUser(authenticatedUser);

            // ✅ Cargar datos adicionales del documento de usuario desde Firestore
            const userDocRef = doc(dbInstance, "users", authenticatedUser.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
              const userData = userDocSnap.data() as UserDocumentData; // Casteamos los datos al tipo esperado
              setUserRole(userData.role || null); // Almacenamos el rol (usamos || null por si el campo 'role' no existe)
              // ✅ Opcional: Si tu componente padre HomePageContent.tsx necesita otros datos
              // del documento de usuario (como invitationDocId o employeeDataCompleted),
              // también podrías almacenarlos en estados aquí y exportarlos.
              // Por ejemplo:
              // setNeedsInvitationCode(!userData.invitationDocId); // Si tu lógica de needsInvitationCode depende de invitationDocId
              // setIsEmployeeDataCompleted(userData.employeeDataCompleted === true); // Si tienes un flag de completado
            } else {
              // Si el usuario Auth existe pero NO tiene documento en 'users', su rol es null/indefinido
              setUserRole(null); // O podrías establecer un rol por defecto como 'unregistered'
              console.log(
                `useAuth: Usuario ${authenticatedUser.uid} autenticado pero sin documento en Firestore 'users'.`
              );
              // ✅ Opcional: Podrías establecer un flag aquí si necesitas que el componente padre
              // sepa específicamente que necesita validar el código inicial.
              // Por ejemplo, si en HomePageContent quieres usar `needsInvitationCode`.
              // setNeedsInvitationCode(true);
            }
          } else {
            // Si no hay usuario (logout), limpiamos el estado
            setUser(null);
            setUserRole(null);
            // ✅ Opcional: Limpiar también flags relacionados con el documento de usuario
            // setNeedsInvitationCode(false);
            // setIsEmployeeDataCompleted(false);
          }
          // ✅ Es una buena práctica añadir `reloadTrigger` a las dependencias aquí
          // para que el effect se re-ejecute y recargue datos cuando se llame a reloadUserData.
        } catch (err) {
          console.error("useAuth: Error fetching user document:", err);
          setError(err as Error); // Almacenamos cualquier error
          // Si falla la carga del documento, podríamos querer resetear rol/flags
          setUserRole(null);
          // setNeedsInvitationCode(false);
          // setIsEmployeeDataCompleted(false);
        } finally {
          // Finalizamos el estado de carga después de procesar el usuario y su documento
          setLoading(false);
        }
      }
    );

    // Función de limpieza: se ejecuta cuando el componente que usa el hook se desmonta
    // o antes de que el effect se re-ejecute (ej: por un cambio en reloadTrigger).
    // Esto desuscribe el listener de autenticación para evitar fugas de memoria.
    return () => unsubscribe();

    // Dependencias del Effect:
    // Este effect debe re-ejecutarse si `reloadTrigger` cambia, para forzar una recarga.
    // No necesita depender de `user`, `userRole`, `loading`, `error` porque estos son estados
    // que este mismo effect actualiza.
    // No necesita depender de `authInstance` o `dbInstance` si estas instancias
    // son constantes (obtenidas una vez de clientApp) o si getAuth/getFirestore
    // siempre devuelven la misma instancia para la app por defecto.
  }, [reloadTrigger]); // ✅ Dependencia en reloadTrigger para forzar re-fetch

  // Función para forzar la recarga del documento de usuario y el rol
  const reloadUserData = async () => {
    console.log("useAuth: Forzando recarga de datos del usuario y rol.");
    // Incrementamos el estado local reloadTrigger. Esto hará que el useEffect
    // se re-ejecute, lo que disparará el fetch del documento de usuario de nuevo.
    // No necesitamos esperar el resultado aquí, ya que el useEffect maneja eso.
    setReloadTrigger((prev) => prev + 1);
    // Opcional: Puedes establecer un estado de carga temporal aquí si quieres que `loading` sea true
    // inmediatamente después de llamar a reloadUserData, aunque el effect lo pondrá en true de todos modos.
  };

  // Exportar el estado y las funciones/datos que necesiten los componentes que usen este hook
  return {
    user, // Objeto User de Auth (uid, email, displayName, etc.)
    userRole, // Rol leído del documento de usuario en Firestore
    loading, // Estado de carga
    error, // Cualquier error
    reloadUserData, // ✅ Exponemos la función para recargar datos
    // ✅ Opcional: Exporta otros estados si los añadiste (ej: needsInvitationCode, isEmployeeDataCompleted)
    // needsInvitationCode,
    // isEmployeeDataCompleted,
  };
};

// No necesitas exportar la función useAuth por defecto si ya la exportas con nombre
// export default useAuth;

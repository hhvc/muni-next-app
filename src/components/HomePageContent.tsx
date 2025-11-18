// src/components/HomePageContent.tsx
"use client";

// Importa los hooks personalizados para acceder al contexto de autenticación y Firebase
import { useAuth } from "@/components/AuthProvider";
import useFirebase from "@/hooks/useFirebase"; // Lo usaremos para leer documentos de Firestore

// Importa tus componentes de pantalla principales
import GoogleSignInPage from "./GoogleSignInPage";
import Login from "./Login";
import EmployeeForm from "./EmployeeForm";

// Importa componentes simples para carga y error
import LoadingSpinner from "./LoadingSpinner";
import ErrorMessage from "./ErrorMessage";

// Importa funcionalidades de Firestore
import { doc, getDoc } from "firebase/firestore";

// Importa hooks y componentes de React/Next.js
import { useEffect, useState } from "react";
import { Container } from "react-bootstrap"; // Solo Container, eliminamos Row, Col, Card que no se usan

// Importar el nuevo dashboard central
import CentralDashboard from "./dashboards/CentralDashboard";

// Definimos interfaces para los datos esperados de Firestore
interface UserData {
  role: string;
  invitationDocId?: string;
}

interface InvitationData {
  used: boolean;
}

export default function HomePageContent() {
  // Consume el estado del usuario autenticado y de carga/error del AuthProvider
  const {
    user,
    loadingUserStatus,
    hasError: authProviderHasError,
    errorDetails: authProviderErrorDetails,
  } = useAuth();

  // Obtenemos la instancia de Firestore y su estado de inicialización desde useFirebase
  const { db: firestoreDb, isInitialized: firebaseInitialized } = useFirebase();

  // --- Estados Locales para Cargar y Almacenar Datos Relevantes de Firestore ---
  const [userData, setUserData] = useState<UserData | null>(null);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(
    null
  );
  const [isLoadingFirestore, setIsLoadingFirestore] = useState(true);
  const [firestoreLoadError, setFirestoreLoadError] = useState<Error | null>(
    null
  );
  const [retryCount, setRetryCount] = useState(0);
  const [newUserCreated, setNewUserCreated] = useState(false);

  // --- Efecto para cargar datos del usuario y la invitación desde Firestore ---
  useEffect(() => {
    const fetchFirestoreData = async () => {
      setIsLoadingFirestore(true);
      setFirestoreLoadError(null);

      if (!newUserCreated) {
        setUserData(null);
        setInvitationData(null);
      }

      try {
        if (!user || !firebaseInitialized || !firestoreDb) {
          if (newUserCreated) {
            // Lógica de reintento para nuevo usuario
          }
          setIsLoadingFirestore(false);
          return;
        }

        console.log("Iniciando carga de datos de Firestore para:", user.uid);

        // 1. Cargar datos del usuario
        const userDocRef = doc(firestoreDb, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          console.log("Documento de usuario no encontrado");

          if (newUserCreated && retryCount < 3) {
            console.log(`Reintentando en 1 segundo (${retryCount + 1}/3)`);
            setTimeout(() => setRetryCount((prev) => prev + 1), 1000);
            return;
          }

          setUserData(null);
          setIsLoadingFirestore(false);
          return;
        }

        const currentUserData = userDocSnap.data() as UserData;
        setUserData(currentUserData);
        console.log("Datos de usuario cargados:", currentUserData);
        setNewUserCreated(false);

        // 2. Si es candidato, cargar datos de invitación
        if (
          currentUserData.role === "candidate" &&
          currentUserData.invitationDocId
        ) {
          const invitationDocRef = doc(
            firestoreDb,
            "candidateInvitations",
            currentUserData.invitationDocId
          );
          const invitationDocSnap = await getDoc(invitationDocRef);

          if (invitationDocSnap.exists()) {
            const invitation = invitationDocSnap.data() as InvitationData;
            setInvitationData(invitation);
            console.log("Datos de invitación cargados:", invitation);
          } else {
            console.warn("Documento de invitación no encontrado");
            setInvitationData(null);
          }
        }
      } catch (error) {
        console.error("Error cargando datos de Firestore:", error);
        setFirestoreLoadError(error as Error);

        if (retryCount < 3) {
          console.log(`Reintentando en 5 segundos (${retryCount + 1}/3)`);
          setTimeout(() => setRetryCount((prev) => prev + 1), 5000);
        } else {
          setIsLoadingFirestore(false);
        }
      } finally {
        setIsLoadingFirestore(false);
        setNewUserCreated(false);
      }
    };

    fetchFirestoreData();
  }, [user, firebaseInitialized, firestoreDb, retryCount, newUserCreated]);

  const handleNewUserValidatedCode = () => {
    console.log("Nuevo usuario validado, forzando recarga");
    setNewUserCreated(true);
    setRetryCount(0);
  };

  // Función para obtener la ruta del dashboard específico según el rol
  const getSpecificDashboardRoute = (role: string): string => {
    const roleLower = role.toLowerCase();
    switch (roleLower) {
      case "root":
        return "/dashboard/root";
      case "rrhh":
      case "rrhh admin":
        return "/dashboard/hr";
      case "colaborador":
        return "/dashboard/collaborator";
      case "datos":
        return "/dashboard/data";
      case "admin principal":
        return "/dashboard/admin";
      default:
        return "/dashboard";
    }
  };

  // --- Lógica de Renderizado Condicional Principal ---
  // 1. Estado de Carga
  if (loadingUserStatus || (user && isLoadingFirestore)) {
    return <LoadingSpinner />;
  }

  // 2. Estado de Error
  if (authProviderHasError) {
    return <ErrorMessage errorDetails={authProviderErrorDetails} />;
  }
  if (firestoreLoadError) {
    return (
      <Container className="mt-5 text-center">
        <h3>Error al cargar datos</h3>
        <p>{firestoreLoadError.message}</p>
        {retryCount < 3 ? (
          <p>Intentando nuevamente...</p>
        ) : (
          <button
            className="btn btn-primary mt-3"
            onClick={() => setRetryCount(0)}
          >
            Reintentar Carga
          </button>
        )}
      </Container>
    );
  }

  // 3. Si no hay usuario autenticado
  if (!user) {
    return <GoogleSignInPage />;
  }

  // 4. Lógica principal para usuarios con documento
  if (userData) {
    if (
      userData.role === "candidate" &&
      userData.invitationDocId &&
      invitationData &&
      invitationData.used === false
    ) {
      return (
        <EmployeeForm
          invitationId={userData.invitationDocId}
          userId={user.uid}
        />
      );
    }

    // Redirigir al dashboard central para todos los usuarios autenticados
    // que no son candidatos con formulario pendiente
    return (
      <CentralDashboard
        user={user}
        userRole={userData.role}
        specificDashboardRoute={getSpecificDashboardRoute(userData.role)}
      />
    );
  }

  // 5. Usuario sin documento en 'users'
  return (
    <Login
      isGoogleAuthenticated={true}
      onCodeValidated={handleNewUserValidatedCode}
    />
  );
}

// src/components/HomePageContent.tsx
"use client";

import { useAuth } from "@/components/AuthProvider";
import useFirebase from "@/hooks/useFirebase";
import GoogleSignInPage from "./GoogleSignInPage";
import Login from "./Login";
import EmployeeForm from "./EmployeeForm";
import AdminDashboard from "./AdminDashboard";
import LoadingSpinner from "./LoadingSpinner";
import ErrorMessage from "./ErrorMessage";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Container, Row, Col, Card } from "react-bootstrap";

interface UserData {
  role: string;
  invitationDocId?: string;
}

interface InvitationData {
  used: boolean;
  expirationDate?: Date;
}

export default function HomePageContent() {
  const {
    user,
    loadingUserStatus,
    hasError: authProviderHasError,
    errorDetails: authProviderErrorDetails,
  } = useAuth();

  const { db: firestoreDb, isInitialized: firebaseInitialized } = useFirebase();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(
    null
  );
  const [isLoadingFirestore, setIsLoadingFirestore] = useState(true);
  const [firestoreLoadError, setFirestoreLoadError] = useState<Error | null>(
    null
  );
  const [retryCount, setRetryCount] = useState(0);
  const [forceReload, setForceReload] = useState(0);
  const [newUserCreated, setNewUserCreated] = useState(false); // Nuevo estado para rastrear creación de usuario

  // Carga de datos de Firestore
  useEffect(() => {
    const fetchFirestoreData = async () => {
      setIsLoadingFirestore(true);
      setFirestoreLoadError(null);

      try {
        // Solo cargar datos si tenemos usuario y Firebase está inicializado
        if (!user || !firebaseInitialized || !firestoreDb) {
          setIsLoadingFirestore(false);
          return;
        }

        console.log("Iniciando carga de datos de Firestore para:", user.uid);

        // 1. Cargar datos del usuario
        const userDocRef = doc(firestoreDb, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          console.log("Documento de usuario no encontrado");

          // Si acabamos de crear un usuario, intentar nuevamente después de un breve retraso
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

        // Reintento automático
        if (retryCount < 3) {
          console.log(`Reintentando en 5 segundos (${retryCount + 1}/3)`);
          setTimeout(() => setRetryCount((prev) => prev + 1), 5000);
        } else {
          setIsLoadingFirestore(false);
        }
      } finally {
        setIsLoadingFirestore(false);
        setNewUserCreated(false); // Resetear estado después de la carga
      }
    };

    fetchFirestoreData();
  }, [
    user,
    firebaseInitialized,
    firestoreDb,
    retryCount,
    forceReload,
    newUserCreated,
  ]);

  const handleNewUserValidatedCode = () => {
    console.log("Nuevo usuario validado, forzando recarga");
    setNewUserCreated(true); // Marcar que se creó un nuevo usuario
    setRetryCount(0); // Resetear contador de reintentos
    setForceReload((prev) => prev + 1); // Forzar recarga de datos
  };

  // Estado de carga general
  if (loadingUserStatus || isLoadingFirestore) {
    return <LoadingSpinner />;
  }

  // Manejo de errores
  if (authProviderHasError) {
    return <ErrorMessage errorDetails={authProviderErrorDetails} />;
  }

  if (firestoreLoadError) {
    return (
      <Container className="mt-5 text-center">
        <h3>Error al cargar datos</h3>
        <p>{firestoreLoadError.message}</p>
        {retryCount < 3 ? (
          <p>Intentando nuevamente en 5 segundos...</p>
        ) : (
          <button
            className="btn btn-primary mt-3"
            onClick={() => setRetryCount(0)}
          >
            Reintentar
          </button>
        )}
      </Container>
    );
  }

  // Usuario no autenticado
  if (!user) {
    return <GoogleSignInPage />;
  }

  // Usuarios administradores
  if (userData?.role === "RRHH Admin" || userData?.role === "Admin Principal") {
    return <AdminDashboard />;
  }

  // Nuevos usuarios (sin datos en Firestore)
  if (!userData) {
    return (
      <Login
        isGoogleAuthenticated={true}
        onCodeValidated={handleNewUserValidatedCode}
      />
    );
  }

  // Candidatos con invitación válida
  if (
    userData.role === "candidate" &&
    userData.invitationDocId &&
    invitationData &&
    invitationData.used === false
  ) {
    return (
      <EmployeeForm invitationId={userData.invitationDocId} userId={user.uid} />
    );
  }

  // Estados no válidos
  return (
    <Container className="mt-5">
      <Row className="justify-content-md-center">
        <Col md={8}>
          <Card className="shadow">
            <Card.Header className="bg-info text-white text-center py-3">
              <Card.Title>Estado de Cuenta</Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="alert alert-info text-center">
                <h3>Información de tu cuenta</h3>

                <p>
                  Rol: <strong>{userData.role}</strong>
                </p>

                {userData.role === "candidate" && (
                  <>
                    {!userData.invitationDocId ? (
                      <p className="text-danger">
                        Tu cuenta no tiene una invitación asociada.
                      </p>
                    ) : !invitationData ? (
                      <p className="text-danger">
                        No se encontró la invitación asociada a tu cuenta.
                      </p>
                    ) : invitationData.used === true ? (
                      <p className="text-danger">
                        La invitación ya ha sido utilizada.
                      </p>
                    ) : (
                      <p className="text-danger">
                        Estado desconocido de la invitación.
                      </p>
                    )}
                  </>
                )}

                {userData.role !== "candidate" && (
                  <p>
                    Tu rol actual no requiere completar el formulario de
                    registro.
                  </p>
                )}

                <p className="mt-3">
                  Si necesitas ayuda, contacta al equipo de administración.
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

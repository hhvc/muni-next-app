"use client";

import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Card,
  Alert,
  Spinner,
} from "react-bootstrap";
import Image from "next/image";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  Timestamp, // Importado desde 'firebase/firestore'
  arrayUnion,
} from "firebase/firestore";
import { FirebaseError } from "firebase/app"; // Importado desde 'firebase/app'
import { useAuth } from "@/components/AuthProvider";
import useFirebase from "@/hooks/useFirebase";
import { useRouter } from "next/navigation";

interface LoginProps {
  isGoogleAuthenticated?: boolean;
  onCodeValidated?: () => void;
  onGoogleLoginClick?: () => void;
}

const Login: React.FC<LoginProps> = ({
  isGoogleAuthenticated = false,
  onCodeValidated,
  onGoogleLoginClick,
}) => {
  const { user, reloadUserData } = useAuth();
  const { db: firestoreDb, isInitialized: firebaseInitialized } = useFirebase();
  const router = useRouter();

  const [dni, setDni] = useState("");
  const [invitationCode, setInvitationCode] = useState(""); // Variable de estado para el código
  const [message, setMessage] = useState<{
    type: "success" | "danger" | "warning";
    text: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);

  // Effect para verificar cuando la instancia de Firestore está lista (desde useFirebase)
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (firestoreDb && firebaseInitialized) {
      setFirebaseReady(true);
      // Limpiamos cualquier mensaje de error previo de inicialización si ahora está listo
      setMessage(null);
    } else {
      // Si aún no está listo, establecemos un timer para mostrar un mensaje si tarda demasiado
      timer = setTimeout(() => {
        if (!firebaseReady) {
          // Solo si aún no se ha marcado como listo
          setMessage({
            type: "warning", // Cambiado a warning para ser menos agresivo
            text: "La conexión a Firebase tarda en establecerse. Por favor, verifica tu conexión o recarga la página.",
          });
        }
      }, 3000); // Esperar 3 segundos para mostrar el mensaje de carga lenta
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [firestoreDb, firebaseInitialized, firebaseReady]);

  // Maneja el envío del formulario de DNI/Código
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Validaciones iniciales
    if (!firebaseReady || !firestoreDb) {
      setMessage({
        type: "danger",
        text: "Error de conexión: Firebase no está listo. Por favor espera o recarga.",
      });
      return;
    }
    if (!isGoogleAuthenticated || !user) {
      setMessage({
        type: "danger",
        text: "Error de autenticación: No hay un usuario de Google logueado. Por favor, cierra sesión y vuelve a intentar.",
      });
      setIsLoading(false);
      return;
    }
    if (!dni || !invitationCode) {
      setMessage({
        type: "warning",
        text: "Por favor, ingresá tu DNI y código de invitación para continuar.",
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const userDocRef = doc(firestoreDb, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      const loginTimestamp = Timestamp.now();

      if (userDocSnap.exists()) {
        console.log(
          `Login: Usuario existente '${user.uid}' detectado. Actualizando historial de login.`
        );

        await updateDoc(userDocRef, {
          loginHistory: arrayUnion(loginTimestamp),
          lastLoginAt: loginTimestamp,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        });

        console.log(
          `Login: Historial de login actualizado para usuario '${user.uid}'.`
        );

        if (reloadUserData) {
          await reloadUserData();
          console.log("Login: Datos de usuario recargados desde AuthProvider.");
        }

        setMessage({
          type: "success",
          text: "¡Bienvenido de nuevo! Accediendo...",
        });
        router.push("/");
      } else {
        console.log(
          `Login: Usuario nuevo '${user.uid}'. Procediendo a validar DNI/Código para registro inicial.`
        );

        const invitationsCollection = collection(
          firestoreDb,
          "candidateInvitations"
        );

        // 🟢 MANTENIDO COMO "code": La consulta busca el campo 'code' en Firestore.
        const invitationsQuery = query(
          invitationsCollection,
          where("dni", "==", dni),
          where("code", "==", invitationCode), // ⬅️ ¡Aquí buscamos por el campo 'code'!
          where("used", "==", false)
        );

        const querySnapshot = await getDocs(invitationsQuery);

        if (querySnapshot.empty) {
          console.warn(
            `Login: Invitación no encontrada o ya usada para DNI: ${dni}, Code: ${invitationCode}`
          );
          setMessage({
            type: "danger",
            text: "DNI o código incorrectos, o la invitación ya fue utilizada para completar un registro.",
          });
          setIsLoading(false);
          return;
        }

        console.log(
          "Login: Invitación válida encontrada para un nuevo registro."
        );
        const invitationDoc = querySnapshot.docs[0];
        const invitationId = invitationDoc.id;
        const invitationData = invitationDoc.data();

        const roleFromInvitation = invitationData?.role || "candidate";
        console.log(
          `Login: Rol determinado para el nuevo usuario: ${roleFromInvitation}`
        );

        const newUserData = {
          dni: dni,
          invitationCode: invitationCode, // Valor del código que se usó
          invitationDocId: invitationId,
          role: roleFromInvitation,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: loginTimestamp,
          loginHistory: [loginTimestamp],
          lastLoginAt: loginTimestamp,
          // Puedes añadir otros campos iniciales para un nuevo usuario si es necesario
        };

        await setDoc(userDocRef, newUserData);
        console.log(
          `Login: Nuevo documento de usuario '${user.uid}' creado con datos iniciales. Rol: ${roleFromInvitation}`
        );

        // 🟢 IMPORTANTE: Marcar la invitación como usada después de crear el userDoc
        const invitationToUpdateRef = doc(
          firestoreDb,
          "candidateInvitations",
          invitationId
        );
        await updateDoc(invitationToUpdateRef, {
          used: true,
          usedAt: loginTimestamp,
          usedBy: user.uid,
        });
        console.log(`Login: Invitación '${invitationId}' marcada como usada.`);

        if (reloadUserData) {
          await reloadUserData();
          console.log(
            "Login: Datos de usuario recargados después de la creación."
          );
        }

        if (roleFromInvitation === "candidate") {
          setMessage({
            type: "success",
            text: "Código validado. Por favor, completa tus datos.",
          });
          if (onCodeValidated) {
            onCodeValidated();
          } else {
            console.warn(
              "Login: onCodeValidated callback no proporcionado para nuevo candidato. Redirigiendo por defecto."
            );
            router.push("/");
          }
        } else {
          setMessage({
            type: "success",
            text: `¡Bienvenido! Tu rol asignado es: ${roleFromInvitation}. Accediendo...`,
          });
          router.push("/");
        }
      }
    } catch (error: unknown) {
      console.error(
        "Login: Error durante el proceso de login/validación:",
        error
      );

      let errorMessage = "Ha ocurrido un error inesperado durante el proceso.";
      if (error instanceof FirebaseError) {
        errorMessage = `Error de Firebase (${error.code}): ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }

      setMessage({
        type: "danger",
        text: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Renderiza un spinner mientras la instancia de Firestore se inicializa en este componente
  if (!firebaseReady) {
    return (
      <Container className="text-center my-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Inicializando conexión a Firebase...</p>
      </Container>
    );
  }

  // Renderiza el formulario DNI/Código si el usuario de Google está autenticado,
  // o el botón de Google Login si no lo está.
  return (
    <Container className="mt-5">
      <Row className="justify-content-md-center">
        <Col md={6}>
          <Card className="shadow">
            <Card.Header className="bg-primary text-white text-center py-3">
              <Card.Title>
                {isGoogleAuthenticated
                  ? "Completa tu Registro / Ingreso" // Texto actualizado para reflejar ambos flujos
                  : "Acceso de Candidatos"}
              </Card.Title>
            </Card.Header>
            <Card.Body>
              <Card.Text className="text-center mb-4">
                {isGoogleAuthenticated
                  ? "Ingresá tu DNI y código para continuar o actualizar tu ingreso." // Texto actualizado
                  : "Autentícate primero con Google para continuar."}
              </Card.Text>
              {/* Muestra mensajes de éxito, error o advertencia */}
              {message && (
                <Alert variant={message.type} className="text-center">
                  {message.text}
                </Alert>
              )}

              {/* Condicional: Muestra el formulario DNI/Código si el usuario de Google está autenticado,
                  o el botón de Google Login si no lo está. */}
              {isGoogleAuthenticated ? (
                <Form onSubmit={handleSubmit} className="mt-3">
                  <Form.Group className="mb-3">
                    <Form.Label>DNI</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Ingresa tu DNI"
                      value={dni}
                      onChange={(e) => setDni(e.target.value)}
                      required
                      disabled={isLoading} // Deshabilita campos mientras carga
                    />
                  </Form.Group>
                  <Form.Group className="mb-4">
                    <Form.Label>Código de Invitación</Form.Label>
                    <Form.Control
                      type="text" // Tipo "text" para el código (podría ser password si es muy sensible)
                      placeholder="Ingresa tu código"
                      value={invitationCode} // 🟢 Usamos el estado 'invitationCode' aquí
                      onChange={(e) => setInvitationCode(e.target.value)} // 🟢 Actualiza el estado 'invitationCode'
                      required
                      disabled={isLoading} // Deshabilita campos mientras carga
                    />
                  </Form.Group>
                  <Button
                    variant="primary"
                    type="submit"
                    className="w-100 py-2"
                    disabled={isLoading || !user} // Deshabilita si está cargando o no hay user (por si acaso)
                  >
                    {/* Texto del botón basado en el estado de carga */}
                    {isLoading ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          className="me-2"
                        />
                        Procesando...{" "}
                        {/* Texto más general para ambos flujos (nuevo/existente) */}
                      </>
                    ) : (
                      "Validar Código / Ingresar" // Texto genérico si no está cargando
                      /*
                         Nota: Determinar si es "Validar Código" (nuevo) vs "Actualizar Ingreso" (existente)
                         antes del envío requeriría cargar el documento del usuario `userDocSnap`
                         en un `useEffect` al inicio del componente y guardar su estado en un `useState`.
                         Por simplicidad en este `return`, usamos un texto combinado o general.
                      */
                    )}
                  </Button>
                </Form>
              ) : (
                // Muestra el botón de Google Login si el usuario NO está autenticado con Google
                <div className="text-center mt-4">
                  <Button
                    variant="outline-danger"
                    className="d-flex align-items-center justify-content-center mx-auto px-4 py-2"
                    onClick={onGoogleLoginClick} // Llama al callback para iniciar el login de Google
                  >
                    <Image
                      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                      alt="Google logo"
                      width={24}
                      height={24}
                      className="me-2"
                      unoptimized // Para evitar optimizaciones de Next.js en esta imagen externa
                    />
                    Ingresar con Google
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}; // <-- Cierre de la función del componente Login

export default Login;

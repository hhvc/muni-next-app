// src/components/Login.tsx
"use client";

import React, { useState } from "react";
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
import { auth, db } from "@/firebase/clientApp";
import {
  doc,
  getDocs,
  query,
  collection,
  where,
  updateDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/components/AuthProvider"; // Importa el contexto de autenticación

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
  const { reloadUserData } = useAuth(); // Obtiene la función de recarga del contexto
  const [dni, setDni] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "danger";
    text: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const currentUser = auth.currentUser;

    if (isGoogleAuthenticated && !currentUser) {
      setMessage({
        type: "danger",
        text: "Error interno de autenticación. Por favor, intente loguearse de nuevo.",
      });
      setIsLoading(false);
      return;
    }

    if (isGoogleAuthenticated && (!dni || !invitationCode)) {
      setMessage({
        type: "danger",
        text: "Por favor, ingrese su DNI y código de invitación.",
      });
      setIsLoading(false);
      return;
    }

    if (!isGoogleAuthenticated) {
      setMessage({
        type: "danger",
        text: "Por favor, autentíquese primero con Google.",
      });
      setIsLoading(false);
      return;
    }

    try {
      // Validación de la invitación
      const invitationsQuery = query(
        collection(db, "candidateInvitations"),
        where("dni", "==", dni),
        where("code", "==", invitationCode),
        where("used", "==", false)
      );

      const querySnapshot = await getDocs(invitationsQuery);

      console.log(
        "Docs encontradas:",
        querySnapshot.docs.map((d) => ({ id: d.id, data: d.data() }))
      );

      if (querySnapshot.empty) {
        setMessage({
          type: "danger",
          text: "DNI o Código de Invitación incorrectos o ya utilizado.",
        });
        setIsLoading(false);
        return;
      }

      const invitationDoc = querySnapshot.docs[0];
      const invitationId = invitationDoc.id;
      const invitationRef = doc(db, "candidateInvitations", invitationId);

      await updateDoc(invitationRef, {
        used: true,
        usedByUserId: currentUser?.uid,
        usedTimestamp: Timestamp.now(),
      });

      console.log("Invitación marcada como usada:", invitationId);

      if (currentUser) {
        // 1. Crear documento de usuario (si no existe)
        const userDocRef = doc(db, "users", currentUser.uid);
        await setDoc(
          userDocRef,
          {
            dni: dni,
            invitationCode: invitationCode,
            role: "candidate", // Asignar rol directamente
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            createdAt: Timestamp.now(),
          },
          { merge: true } // Solo actualizar campos especificados
        );

        console.log(
          "Datos de validación guardados en Firestore para el usuario:",
          currentUser.uid
        );

        // 2. Forzar recarga de datos de usuario
        reloadUserData();

        // 3. Notificar al componente padre
        if (onCodeValidated) {
          onCodeValidated();
        }

        setMessage({
          type: "success",
          text: "¡Validación exitosa! Redirigiendo a tu perfil...",
        });
      }
    } catch (error: unknown) {
      console.error("Error durante la validación DNI/Código:", error);

      if (error instanceof FirebaseError) {
        setMessage({
          type: "danger",
          text: `Error de Firebase: ${error.code} - ${error.message}`,
        });
      } else if (error instanceof Error) {
        setMessage({
          type: "danger",
          text: `Error: ${error.message}`,
        });
      } else {
        setMessage({
          type: "danger",
          text: "Error desconocido al validar tu información.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-md-center">
        <Col md={6}>
          <Card className="shadow">
            <Card.Header className="bg-primary text-white text-center py-3">
              <Card.Title>
                {isGoogleAuthenticated
                  ? "Completa tu Registro"
                  : "Acceso de Candidatos"}
              </Card.Title>
            </Card.Header>

            <Card.Body>
              <Card.Text className="text-center mb-4">
                {isGoogleAuthenticated
                  ? "Ingresa tu DNI y código de invitación para continuar"
                  : "Autentícate con Google para acceder al sistema"}
              </Card.Text>

              {message && (
                <Alert variant={message.type} className="text-center">
                  {message.text}
                </Alert>
              )}

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
                      disabled={isLoading}
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>Código de Invitación</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Ingresa tu código"
                      value={invitationCode}
                      onChange={(e) => setInvitationCode(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </Form.Group>

                  <Button
                    variant="primary"
                    type="submit"
                    className="w-100 py-2"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          className="me-2"
                        />
                        Validando...
                      </>
                    ) : (
                      "Validar Código"
                    )}
                  </Button>
                </Form>
              ) : (
                <div className="text-center mt-4">
                  <Button
                    variant="outline-danger"
                    className="d-flex align-items-center justify-content-center mx-auto px-4 py-2"
                    onClick={onGoogleLoginClick}
                  >
                    <Image
                      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                      alt="Google logo"
                      width={24}
                      height={24}
                      className="me-2"
                      unoptimized
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
};

export default Login;

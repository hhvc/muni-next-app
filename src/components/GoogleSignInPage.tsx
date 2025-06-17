"use client";

import React from "react";
import { Container, Row, Col, Button, Card } from "react-bootstrap";
import Image from "next/image";
import { auth } from "@/firebase/clientApp";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { FirebaseError } from "firebase/app";

const GoogleSignInPage: React.FC = () => {
  const handleGoogleSignIn = async () => {
    // Verificar que auth esté disponible
    if (!auth) {
      console.error("Firebase Auth no está disponible");
      return;
    }

    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      console.log(
        "Usuario autenticado con Google (pop-up cerrado exitosamente)"
      );
    } catch (error: unknown) {
      console.error("Error durante la autenticación con Google:", error);

      if (error instanceof FirebaseError) {
        switch (error.code) {
          case "auth/popup-closed-by-user":
            console.warn("Autenticación cancelada por el usuario.");
            break;
          case "auth/cancelled-popup-request":
            console.warn("Ya hay una ventana de pop-up abierta.");
            break;
          case "auth/popup-blocked":
            console.warn(
              "Pop-up de inicio de sesión bloqueado por el navegador."
            );
            break;
          case "auth/operation-not-allowed":
            console.error(
              "Error de configuración: El método de inicio de sesión (Google) no está habilitado en Firebase Console."
            );
            break;
          case "auth/account-exists-with-different-credential":
            console.warn(
              "Ya existe una cuenta con ese email usando otra forma de inicio de sesión."
            );
            break;
          default:
            console.error(
              `Error desconocido de Firebase Auth: ${error.code} - ${error.message}`
            );
            break;
        }
      } else if (error instanceof Error) {
        console.error("Error general:", error.message);
      } else {
        console.error("Error desconocido:", error);
      }
    }
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-md-center">
        <Col xs lg="6">
          <Card className="text-center">
            <Card.Body>
              <Card.Title className="mb-4">Sitio Privado</Card.Title>
              <Card.Text>
                Está ingresando a un sitio privado. Para avanzar debe loguearse
                con Google.
              </Card.Text>
              <Button variant="danger" onClick={handleGoogleSignIn}>
                <Image
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google logo"
                  width={18}
                  height={18}
                  style={{ marginRight: "8px", verticalAlign: "middle" }}
                  unoptimized={true}
                />
                Ingresar con Google
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default GoogleSignInPage;

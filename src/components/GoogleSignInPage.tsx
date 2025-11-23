"use client";

import React from "react";
import { Button } from "react-bootstrap";
import Image from "next/image";
import { auth } from "@/firebase/clientApp";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { createPlatformUser } from "@/services/userService";
import { logger } from "@/utils/logger";

const GoogleSignInPage: React.FC = () => {
  const handleGoogleSignIn = async () => {
    if (!auth) {
      logger.error("Firebase Auth no está disponible");
      return;
    }

    const provider = new GoogleAuthProvider();
    provider.addScope("email");
    provider.addScope("profile");

    try {
      logger.info("Iniciando autenticación con Google...");
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      logger.success("Usuario autenticado:", user.uid, user.email);

      // Crear o actualizar usuario
      logger.info("Verificando usuario en Firestore...");
      const { isNewUser } = await createPlatformUser(user);

      if (isNewUser) {
        logger.success("NUEVO usuario creado con rol 'pending_verification'");
      } else {
        logger.success("Usuario existente - último login actualizado");
      }
    } catch (error: unknown) {
      logger.error("Error durante la autenticación con Google:", error);

      if (error instanceof FirebaseError) {
        switch (error.code) {
          case "auth/popup-closed-by-user":
            logger.warn("Autenticación cancelada por el usuario.");
            break;
          case "auth/cancelled-popup-request":
            logger.warn("Ya hay una ventana de pop-up abierta.");
            break;
          case "auth/popup-blocked":
            logger.warn(
              "Pop-up de inicio de sesión bloqueado por el navegador."
            );
            break;
          case "auth/operation-not-allowed":
            logger.error(
              "Error de configuración: El método de inicio de sesión (Google) no está habilitado en Firebase Console."
            );
            break;
          case "auth/account-exists-with-different-credential":
            logger.warn(
              "Ya existe una cuenta con ese email usando otra forma de inicio de sesión."
            );
            break;
          default:
            logger.error(
              `Error de Firebase Auth: ${error.code} - ${error.message}`
            );
            break;
        }
      } else if (error instanceof Error) {
        logger.error("Error general:", error.message);
      } else {
        logger.error("Error desconocido:", error);
      }
    }
  };

  return (
    <div
      className="min-vh-100 d-flex flex-column align-items-center justify-content-center"
      style={{ backgroundColor: "#001F3F" }}
    >
      <div className="text-center text-white mb-4">
        <h1 className="display-4 fw-bold">Sitio Privado</h1>
        <p className="lead">Debe loguearse para ingresar</p>
      </div>

      <Button
        variant="light"
        size="lg"
        onClick={handleGoogleSignIn}
        className="d-flex align-items-center px-4 py-2"
      >
        <Image
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt="Google logo"
          width={24}
          height={24}
          className="me-2"
          unoptimized={true}
        />
        Iniciar sesión con Google
      </Button>
    </div>
  );
};

export default GoogleSignInPage;

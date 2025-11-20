"use client";

import React from "react";
import { Button } from "react-bootstrap";
import Image from "next/image";
import { auth } from "@/firebase/clientApp";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { createPlatformUser } from "@/services/userService";

const GoogleSignInPage: React.FC = () => {
  const handleGoogleSignIn = async () => {
    // Verificar que auth esté disponible
    if (!auth) {
      console.error("Firebase Auth no está disponible");
      return;
    }

    const provider = new GoogleAuthProvider();
    try {
      console.log("🔹 Iniciando autenticación con Google...");
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      console.log("✅ Usuario autenticado:", user.uid, user.email);

      // ⭐ CREAR USUARIO CON ROL "nuevo" AUTOMÁTICAMENTE
      console.log("🔹 Creando documento de usuario en Firestore...");
      await createPlatformUser(user);

      console.log("✅ Usuario autenticado con Google y creado con rol 'nuevo'");
    } catch (error: unknown) {
      console.error("❌ Error durante la autenticación con Google:", error);

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

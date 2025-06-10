// src/components/GoogleSignInPage.tsx
"use client"; // ¡¡¡Importante: Declara que este es un Client Component!!!

import React from "react";
import { Container, Row, Col, Button, Card } from "react-bootstrap";
// Importa el componente Image de Next.js para optimización (opcional, pero recomendado por ESLint)
import Image from "next/image"; // <--- Importa Image de next/image

// Importamos la instancia de autenticación de Firebase desde nuestro archivo de inicialización del cliente
import { auth } from "@/firebase/clientApp"; // <-- Usamos el alias y la ruta correcta

// Importamos las funciones específicas de Firebase Auth
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { FirebaseError } from "firebase/app";

const GoogleSignInPage: React.FC = () => {
  // Función para manejar el click del botón de Google Sign-In
  const handleGoogleSignIn = async () => {
    // Crea una nueva instancia del proveedor de Google Auth
    const provider = new GoogleAuthProvider();
    try {
      // Inicia el flujo de autenticación con Google (usando un pop-up)
      // El primer argumento es la instancia de Auth, el segundo es el proveedor.
      await signInWithPopup(auth, provider);

      // Si signInWithPopup se resuelve sin error, significa que el usuario se autenticó.
      // El listener 'onAuthStateChanged' en tu AuthProvider.tsx detectará este cambio
      // en el estado de autenticación, obtendrá el perfil y rol del usuario,
      // actualizará el estado global, y HomePageContent.tsx renderizará
      // automáticamente la pantalla apropiada (Login o AdminDashboard/EmployeeForm).
      // No necesitas hacer ninguna navegación manual aquí.
      console.log(
        "Usuario autenticado con Google (pop-up cerrado exitosamente)"
      );
    } catch (error: unknown) {
      // --- Manejar errores de autenticación ---
      // Estos errores incluyen: pop-up cerrado por el usuario, pop-up bloqueado,
      // permisos denegados, o errores del propio proveedor de Google.

      console.error("Error durante la autenticación con Google:", error);

      // Verificamos el tipo de error para dar un mensaje más específico (opcional)
      if (error instanceof FirebaseError) {
        // Errores específicos de Firebase Auth
        // Puedes ver la lista de códigos de error en la documentación:
        // https://firebase.google.com/docs/reference/js/auth.md#autherrorcode
        switch (error.code) {
          case "auth/popup-closed-by-user":
            console.warn("Autenticación cancelada por el usuario.");
            // Opcional: Mostrar un mensaje al usuario "Inicio de sesión cancelado."
            break;
          case "auth/cancelled-popup-request":
            console.warn("Ya hay una ventana de pop-up abierta.");
            // Opcional: Mostrar un mensaje al usuario "Por favor, complete la ventana de inicio de sesión ya abierta."
            break;
          case "auth/popup-blocked":
            console.warn(
              "Pop-up de inicio de sesión bloqueado por el navegador."
            );
            // Opcional: Instruir al usuario para que permita pop-ups para este sitio.
            break;
          case "auth/operation-not-allowed":
            console.error(
              "Error de configuración: El método de inicio de sesión (Google) no está habilitado en Firebase Console."
            );
            // Este es un error de configuración del proyecto, debería resolverse en la consola.
            break;
          case "auth/account-exists-with-different-credential":
            console.warn(
              "Ya existe una cuenta con ese email usando otra forma de inicio de sesión."
            );
            // Necesitarías implementar lógica para vincular cuentas o informar al usuario.
            break;
          default:
            // Otros errores de Firebase Auth
            // Opcional: Mostrar un mensaje genérico de error de Firebase
            console.error(
              `Error desconocido de Firebase Auth: ${error.code} - ${error.message}`
            );
            break;
        }
        // Opcional: Puedes usar un estado local 'message' en este componente para mostrar el error en la UI.
        // setMessage({ type: 'danger', text: `Error: ${error.message}` });
      } else if (error instanceof Error) {
        // Errores generales de JavaScript/red
        console.error("Error general:", error.message);
        // Opcional: Mostrar mensaje genérico
        // setMessage({ type: 'danger', text: `Hubo un error al ingresar: ${error.message}` });
      } else {
        // Otros tipos de errores desconocidos
        console.error("Error desconocido:", error);
        // Opcional: Mostrar mensaje genérico
        // setMessage({ type: 'danger', text: 'Hubo un error desconocido al ingresar.' });
      }
      // TODO: Si implementaste un estado 'message', asegúrate de limpiarlo al intentar iniciar sesión de nuevo.
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
              {/* Botón de Google Sign-In */}
              <Button variant="danger" onClick={handleGoogleSignIn}>
                {/* >>>>>> Usamos el componente Image de Next.js aquí <<<<<< */}
                {/* Añadimos unoptimized={true} porque es una imagen externa de Google CDN */}
                <Image
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google logo"
                  width={18} // Especifica el ancho (en px)
                  height={18} // Especifica el alto (en px)
                  style={{ marginRight: "8px", verticalAlign: "middle" }} // Estilos en línea (react-style)
                  unoptimized={true} // Desactiva la optimización de Next.js para esta imagen externa
                />
                {/* >>>>>> Fin del componente Image <<<<<< */}
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

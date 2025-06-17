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
  updateDoc, // <-- Necesitamos updateDoc para el historial de login de usuarios existentes
  setDoc,
  getDoc, // <-- ¡Importamos getDoc!
  Timestamp,
  arrayUnion, // <-- ¡Importamos arrayUnion para agregar al historial!
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/components/AuthProvider";
import useFirebase from "@/hooks/useFirebase";
import { useRouter } from "next/navigation"; // Asegúrate de que sea 'next/navigation' para App Router

interface LoginProps {
  isGoogleAuthenticated?: boolean;
  onCodeValidated?: () => void; // Callback para cuando se valida un código por primera vez (lleva a EmployeeForm)
  onGoogleLoginClick?: () => void;
  // Podrías agregar un callback opcional para usuarios existentes, ej: onUserExists?: () => void;
}

const Login: React.FC<LoginProps> = ({
  isGoogleAuthenticated = false,
  onCodeValidated,
  onGoogleLoginClick,
  // onUserExists, // Si agregas el callback para usuarios existentes
}) => {
  // useAuth proporciona el usuario autenticado y una forma de recargar sus datos
  const { user, reloadUserData } = useAuth();
  // useFirebase proporciona la instancia de Firestore (db) y su estado de inicialización
  const { db: firestoreDb, isInitialized: firebaseInitialized } = useFirebase();
  // useRouter para la navegación (si no hay callbacks específicos)
  const router = useRouter();

  const [dni, setDni] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "danger" | "warning";
    text: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);

  // Effect para verificar cuando Firebase está listo
  useEffect(() => {
    // Si Firebase está inicializado CUANDO SE EJECUTA ESTE EFFECT, marcamos como listo.
    if (firebaseInitialized) {
      setFirebaseReady(true);
    } else {
      // Si NO está listo CUANDO SE EJECUTA ESTE EFFECT, programamos una verificación posterior.
      const timer = setTimeout(() => {
        // Dentro del timeout, verificamos si firebaseReady AÚN NO HA SIDO ESTABLECIDO en true.
        // Gracias a firebaseReady en la lista de dependencias, si el estado firebaseReady
        // cambiara por alguna razón, este effect se re-ejecutaría con el nuevo valor.
        // Aunque en esta lógica específica, el cambio esperado es de false a true
        // impulsado por firebaseInitialized cambiando a true, añadir firebaseReady
        // cumple con la regla y asegura que el callback del timeout SIEMPRE
        // use el valor más reciente de firebaseReady si el effect se re-ejecuta.
        if (!firebaseReady) {
          setMessage({
            type: "danger",
            text: "Error: La conexión a Firebase no se estableció correctamente después de esperar. Por favor, recarga la página o verifica tu conexión.",
          });
        }
      }, 1000); // Esperar 1 segundo

      // Función de limpieza: se ejecuta ANTES de que el effect se re-ejecute (si las dependencias cambian)
      // y cuando el componente se desmonta. Esto previene múltiples timers pendientes
      // y asegura que el timer anterior se limpie si firebaseInitialized cambia a true.
      return () => clearTimeout(timer);
    }
  }, [firebaseInitialized, firebaseReady]);

  // Maneja el envío del formulario de DNI/Código
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Previene el comportamiento por defecto del formulario

    // Validaciones iniciales: conexión a Firebase, autenticación de Google, DNI/Código
    if (!firebaseReady || !firestoreDb) {
      setMessage({
        type: "danger",
        text: "La conexión a Firebase no está lista. Por favor espera o recarga.",
      });
      return;
    }
    if (!isGoogleAuthenticated || !user) {
      // Esto no debería ocurrir si el componente se muestra correctamente, pero es una buena verificación de seguridad
      setMessage({
        type: "danger",
        text: "Error interno de autenticación. Por favor, logueate de nuevo con Google.",
      });
      setIsLoading(false);
      return;
    }
    if (!dni || !invitationCode) {
      setMessage({
        type: "warning",
        text: "Por favor, ingresá tu DNI y código de invitación.",
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true); // Inicia el estado de carga
    setMessage(null); // Limpia mensajes previos

    try {
      // 1. Referencia al documento potencial del usuario en Firestore basado en su UID de Google Auth
      const userDocRef = doc(firestoreDb, "users", user.uid);
      // Intentamos obtener el documento para saber si ya existe
      const userDocSnap = await getDoc(userDocRef);

      const loginTimestamp = Timestamp.now(); // Capturamos la hora actual para usarla

      // 2. Verificar si el documento del usuario YA existe en Firestore
      if (userDocSnap.exists()) {
        // Si el usuario existe, significa que ya validó un código antes y creó su documento de usuario.
        // No necesitamos validar DNI/Código de nuevo en este flujo (asumimos que el DNI/Código en el formulario
        // son los que ya usó, aunque esta lógica no los usa en este path).
        // Simplemente actualizamos su historial de login.
        console.log(
          `Usuario existente ${user.uid} detectado. Actualizando historial de login.`
        );

        await updateDoc(userDocRef, {
          // Usa arrayUnion para añadir el timestamp actual al array loginHistory.
          // arrayUnion es la forma recomendada de añadir elementos a un array sin sobreescribirlo
          // y maneja casos donde el campo loginHistory podría no existir aún.
          loginHistory: arrayUnion(loginTimestamp),
          // Opcional: actualizar también un campo específico de último login
          lastLoginAt: loginTimestamp,
          // Puedes actualizar otros campos si es necesario en logins posteriores, ej:
          email: user.email, // Asegurarse de tener el email más reciente de Google Auth
          displayName: user.displayName,
          photoURL: user.photoURL,
          // Nota: No actualizamos DNI/invitationCode aquí, ya que se supone que son fijos después del primer registro.
        });

        console.log(`Historial de login actualizado para usuario ${user.uid}.`);

        // Recargar los datos del usuario en el hook de autenticación si reloadUserData está disponible.
        // Esto podría actualizar el estado local si useAuth expone más datos del documento de usuario.
        if (reloadUserData) {
          await reloadUserData();
        }

        // 3. Lógica para usuarios existentes: Notificar y Redirigir
        // Mostramos un mensaje de bienvenida.
        setMessage({
          type: "success",
          text: "¡Bienvenido de nuevo! Accediendo...",
        });

        // Decide qué hacer aquí para usuarios existentes:
        // Si tienes una ruta por defecto para usuarios ya validados (ej: el dashboard principal), redirige:
        router.push("/");
        // O si esperas que un componente padre maneje esto con un callback (si agregaste onUserExists):
        // if (onUserExists) {
        //     onUserExists(); // Llama al callback, ej: para mostrar el dashboard directamente
        // } else {
        //     router.push("/"); // Opción de fallback si no hay callback
        // }
      } else {
        // Si el documento del usuario NO existe, significa que es la PRIMERA vez que este usuario de Google
        // está validando un código. Procedemos con la validación DNI/Código para REGISTRO.
        console.log(
          `Usuario nuevo ${user.uid}. Procediendo a validar DNI/Código para registro inicial.`
        );

        // 4. Consultar la colección de invitaciones para encontrar una invitación válida para registro
        const invitationsCollection = collection(
          firestoreDb,
          "candidateInvitations"
        );
        // Buscamos una invitación que coincida exactamente con DNI y Código,
        // Y que NO haya sido usada AUN para crear un documento de usuario.
        // La condición `used == false` es la correcta aquí.
        const invitationsQuery = query(
          invitationsCollection,
          where("dni", "==", dni),
          where("code", "==", invitationCode),
          where("used", "==", false)
        );

        const querySnapshot = await getDocs(invitationsQuery);

        // 5. Verificar si se encontró EXACTAMENTE una invitación válida y no usada para registro
        if (querySnapshot.empty) {
          // Si la consulta no devuelve documentos, el DNI/código es incorrecto,
          // o la invitación ya se usó para crear un documento de usuario previamente.
          setMessage({
            type: "danger",
            text: "DNI o código incorrectos, o la invitación ya fue utilizada para completar un registro.",
          });
          setIsLoading(false); // Detenemos la carga aquí
          return; // Salimos de la función
        }

        // Si llegamos aquí, encontramos una invitación válida y que no ha sido usada para un registro.
        console.log("Invitación válida encontrada para un nuevo registro.");
        const invitationDoc = querySnapshot.docs[0];
        const invitationId = invitationDoc.id; // Guardamos el ID del documento de invitación

        // 6. Crear el NUEVO documento del usuario en la colección 'users' con los datos iniciales
        // Usamos setDoc con merge: false (comportamiento por defecto si no existe)
        // Esto crea el documento si no existe. Si por alguna razón inesperada ya existiera, lo reemplaza.
        const newUserData = {
          dni: dni, // Guardamos el DNI proporcionado en este primer registro
          invitationCode: invitationCode, // Guardamos el código usado
          invitationDocId: invitationId, // Opcional: Guardar una referencia al documento de invitación
          role: "candidate", // Establecemos el rol inicial de 'candidate'
          email: user.email, // Guardamos la información del usuario de Google Auth
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: loginTimestamp, // Timestamp del primer registro exitoso
          loginHistory: [loginTimestamp], // Inicializamos el historial con el primer login/registro
          lastLoginAt: loginTimestamp, // El último login es el actual
          // Puedes añadir otros campos iniciales para un nuevo usuario si es necesario
          // profileStatus: 'invitation_validated', // Un estado para saber dónde está en el flujo
          // profileData: {}, // Inicializamos un objeto para los datos del formulario de empleado
        };

        await setDoc(userDocRef, newUserData);
        console.log(
          `Nuevo documento de usuario ${user.uid} creado con datos iniciales.`
        );

        // Recargar los datos del usuario en el hook useAuth para tener la info del documento 'users'
        // Esto es importante si tu hook useAuth lee datos del documento de usuario en Firestore.
        if (reloadUserData) {
          await reloadUserData();
        }

        // 7. Lógica para nuevos usuarios (primera validación): Notificar y proceder al EmployeeForm
        // Mostramos un mensaje indicando que la validación fue exitosa y que procede al formulario.
        setMessage({
          type: "success",
          text: "Código validado. Por favor, completa tus datos.",
        });

        // ✨ Llama al callback onCodeValidated para que el componente padre cambie a mostrar el EmployeeForm.
        // NO marcamos la invitación como 'used' en la colección 'candidateInvitations' aquí.
        // Eso debería hacerse DESPUÉS de que el usuario complete y guarde el EmployeeForm.
        if (onCodeValidated) {
          onCodeValidated(); // Llama al callback para mostrar el EmployeeForm
        } else {
          // Si onCodeValidated no se proporciona (ej: no hay EmployeeForm a continuación en este flujo),
          // podrías redirigir a una página de "Bienvenido, ahora completa tu perfil" o similar.
          // Considera si este es el comportamiento deseado.
          console.warn(
            "Login: onCodeValidated callback not provided. Defaulting to redirect."
          );
          router.push("/"); // Redirige a la página principal por defecto
        }
      }
    } catch (error: unknown) {
      // Manejo general de errores (Firestore, red, etc.)
      console.error("Error durante el proceso de login/validación:", error);

      let errorMessage = "Ha ocurrido un error inesperado durante el proceso.";
      if (error instanceof FirebaseError) {
        // Errores específicos de Firebase
        errorMessage = `Error de Firebase (${error.code}): ${error.message}`;
        // Puedes añadir manejo específico para ciertos códigos de error de Firebase aquí
        // if (error.code === 'permission-denied') { ... }
      } else if (error instanceof Error) {
        // Errores generales de JavaScript
        errorMessage = `Error: ${error.message}`;
      }

      setMessage({
        type: "danger",
        text: errorMessage,
      });
    } finally {
      setIsLoading(false); // Finaliza el estado de carga
    }
  };

  // Renderiza un spinner mientras Firebase se inicializa
  if (!firebaseReady) {
    return (
      <Container className="text-center my-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Inicializando conexión a Firebase...</p>{" "}
        {/* Mensaje más descriptivo */}
      </Container>
    );
  }

  // Renderiza el formulario DNI/Código o el botón de Google Login
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
                  : "Autenticáte primero con Google para continuar."}
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
                      type="text"
                      placeholder="Ingresa tu código"
                      value={invitationCode}
                      onChange={(e) => setInvitationCode(e.target.value)}
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
};

export default Login;

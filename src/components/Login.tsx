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
  updateDoc, // Necesitamos updateDoc para actualizar el historial de login de usuarios existentes
  setDoc, // Necesitamos setDoc para crear el documento del nuevo usuario
  getDoc, // Necesitamos getDoc para verificar si el documento del usuario ya existe
  Timestamp,
  arrayUnion, // Necesitamos arrayUnion para agregar al historial de login
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";
// Asumimos que useAuth ahora proporciona user y reloadUserData, como discutimos
import { useAuth } from "@/components/AuthProvider";
// Asumimos que useFirebase proporciona la instancia db y el estado isInitialized
import useFirebase from "@/hooks/useFirebase";
import { useRouter } from "next/navigation"; // Usamos useRouter para la navegación en Next.js App Router

interface LoginProps {
  // Indica si el usuario de Google ya está autenticado (viene del componente padre, ej: HomePageContent)
  isGoogleAuthenticated?: boolean;
  // Callback que se llama cuando la validación del código DNI es exitosa para un NUEVO usuario con rol 'candidate'.
  // El componente padre (HomePageContent) lo usa para cambiar a mostrar el EmployeeForm.
  onCodeValidated?: () => void;
  // Callback para iniciar el flujo de login de Google (pasado desde el padre si se usa un botón aquí)
  onGoogleLoginClick?: () => void;
  // Opcional: callback para manejar usuarios existentes si el padre necesita un comportamiento específico
  // onUserExists?: () => void;
}

const Login: React.FC<LoginProps> = ({
  isGoogleAuthenticated = false,
  onCodeValidated,
  onGoogleLoginClick,
  // onUserExists,
}) => {
  // Obtenemos el usuario de Google Auth y la función para forzar la recarga de datos del documento de usuario
  const { user, reloadUserData } = useAuth();
  // Obtenemos la instancia de Firestore y su estado de inicialización desde nuestro custom hook
  const { db: firestoreDb, isInitialized: firebaseInitialized } = useFirebase();
  // Hook para la navegación
  const router = useRouter();

  // Estados locales para el formulario y la UI
  const [dni, setDni] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "danger" | "warning";
    text: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Estado para rastrear si la conexión a Firebase (Firestore) está lista para usarse en este componente
  const [firebaseReady, setFirebaseReady] = useState(false);

  // Effect para verificar cuando la instancia de Firestore está lista (desde useFirebase)
  useEffect(() => {
    // Si la instancia de Firestore está disponible Y useFirebase reporta que está inicializado
    if (firestoreDb && firebaseInitialized) {
      setFirebaseReady(true);
    } else {
      // Si no está lista inmediatamente, esperamos un poco.
      const timer = setTimeout(() => {
        // Si después del timer, el estado local 'firebaseReady' AÚN no es true, mostramos el error.
        // Esto indica que la inicialización falló o tardó más de 1 segundo.
        if (!firebaseReady) {
          setMessage({
            type: "danger",
            text: "Error: La conexión a Firebase no se estableció correctamente. Por favor, recarga la página o verifica tu conexión.",
          });
        }
        // Si la inicialización sí ocurrió mientras el timer corría, el effect se re-ejecutó
        // (debido a firebaseInitialized en las dependencias), setFirebaseReady(true) ya se llamó,
        // y este timer original fue limpiado por la función de limpieza.
      }, 1000); // Esperar 1 segundo

      // Función de limpieza: se ejecuta ANTES de que el effect se re-ejecute (si las dependencias cambian)
      // y cuando el componente se desmonta. Limpia el timer pendiente.
      return () => clearTimeout(timer);
    }
    // Dependencias del Effect: Se re-ejecuta si firestoreDb o firebaseInitialized cambian.
    // Añadimos firebaseReady porque lo usamos en el condicional dentro del timer.
  }, [firestoreDb, firebaseInitialized, firebaseReady]);

  // Maneja el envío del formulario de DNI/Código
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Previene el comportamiento por defecto del formulario (recargar página)

    // Validaciones iniciales: conexión a Firebase, autenticación de Google, campos del formulario
    if (!firebaseReady || !firestoreDb) {
      setMessage({
        type: "danger",
        text: "La conexión a Firebase no está lista. Por favor espera o recarga.",
      });
      return;
    }
    // Verificamos que el usuario de Google Auth esté disponible
    if (!isGoogleAuthenticated || !user) {
      // Esto indica un problema: el componente Login para DNI/Código se está mostrando
      // pero el usuario de Google Auth no está presente.
      setMessage({
        type: "danger",
        text: "Error de autenticación: No hay un usuario de Google logueado. Por favor, cierra sesión y vuelve a intentar.",
      });
      setIsLoading(false);
      return;
    }
    // Verificamos que DNI y código hayan sido ingresados
    if (!dni || !invitationCode) {
      setMessage({
        type: "warning", // Usamos warning porque no es un error fatal, solo falta input
        text: "Por favor, ingresá tu DNI y código de invitación para continuar.",
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true); // Inicia el estado de carga
    setMessage(null); // Limpia mensajes previos

    try {
      // 1. Obtener referencia al documento POTENCIAL del usuario en Firestore basado en su UID de Google Auth
      const userDocRef = doc(firestoreDb, "users", user.uid);
      // Intentamos obtener el documento para saber si ya existe
      const userDocSnap = await getDoc(userDocRef);

      const loginTimestamp = Timestamp.now(); // Capturamos la hora actual para usarla en el historial/último login

      // 2. Verificar si el documento del usuario YA existe en Firestore
      if (userDocSnap.exists()) {
        // Si el usuario existe, significa que ya completó el proceso de registro inicial (validó código y creó userDoc).
        // Ahora solo actualizamos su historial de login y lo tratamos como un "re-ingreso".
        console.log(
          `Usuario existente ${user.uid} detectado. Actualizando historial de login.`
        );

        // Actualiza el documento del usuario existente con el nuevo timestamp de login
        await updateDoc(userDocRef, {
          // Usa arrayUnion para añadir el timestamp actual al array loginHistory de forma segura.
          loginHistory: arrayUnion(loginTimestamp),
          // Actualiza el campo específico de último login.
          lastLoginAt: loginTimestamp,
          // Opcional: actualizar otros campos del perfil de usuario Auth si cambiaron (ej: foto de perfil)
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          // Nota: No actualizamos DNI/invitationCode aquí, ya que se supone que son fijos después del primer registro.
        });

        console.log(`Historial de login actualizado para usuario ${user.uid}.`);

        // Recargar los datos del usuario en el hook useAuth. Esto es importante si tu hook lee
        // el documento de usuario para obtener el rol u otros datos y el padre depende de ellos.
        // reloadUserData en useAuth debería forzar el re-fetch del documento de usuario.
        if (reloadUserData) {
          await reloadUserData();
        }

        // 3. Lógica para usuarios existentes: Notificar y Redirigir a la página principal.
        setMessage({
          type: "success",
          text: "¡Bienvenido de nuevo! Accediendo...",
        });

        // Redirige a la página principal por defecto para usuarios que re-ingresan.
        // El componente padre (HomePageContent) decidirá la vista final basándose en el rol cargado.
        router.push("/");

        // Si esperabas que un componente padre manejara esto con un callback (si agregaste onUserExists):
        // if (onUserExists) {
        //     onUserExists(); // Llama al callback, ej: para mostrar el dashboard directamente
        // } else {
        //     router.push("/"); // Opción de fallback
        // }
      } else {
        // Si el documento del usuario NO existe, significa que es la PRIMERA vez que este usuario de Google
        // intenta validar un código para REGISTRAR su cuenta en Firestore.
        console.log(
          `Usuario nuevo ${user.uid}. Procediendo a validar DNI/Código para registro inicial.`
        );

        // 4. Consultar la colección de invitaciones para encontrar una invitación válida para este registro inicial
        const invitationsCollection = collection(
          firestoreDb,
          "candidateInvitations"
        );
        // Buscamos una invitación que coincida exactamente con el DNI y Código ingresados,
        // Y que NO haya sido usada AUN para crear UN DOCUMENTO DE USUARIO.
        // La condición `used == false` aquí es crucial para este flujo de registro inicial.
        const invitationsQuery = query(
          invitationsCollection,
          where("dni", "==", dni),
          where("code", "==", invitationCode),
          where("used", "==", false) // Solo buscamos invitaciones con used: false para el registro inicial
        );

        const querySnapshot = await getDocs(invitationsQuery);

        // 5. Verificar si se encontró EXACTAMENTE una invitación válida y no usada para registro
        if (querySnapshot.empty) {
          // Si la consulta no devuelve documentos, el DNI/código es incorrecto,
          // o la invitación ya se usó previamente para crear UN DOCUMENTO DE USUARIO.
          setMessage({
            type: "danger",
            text: "DNI o código incorrectos, o la invitación ya fue utilizada para completar un registro.",
          });
          setIsLoading(false); // Detenemos la carga aquí
          return; // Salimos de la función
        }

        // Si llegamos aquí, encontramos una invitación válida y que NO ha sido usada para crear un userDoc.
        // Esta es la invitación que utilizaremos para crear el documento del NUEVO usuario.
        console.log("Invitación válida encontrada para un nuevo registro.");
        const invitationDoc = querySnapshot.docs[0]; // Obtenemos el primer documento que coincide (debería ser único)
        const invitationId = invitationDoc.id; // Guardamos el ID del documento de invitación
        const invitationData = invitationDoc.data(); // Obtenemos los datos completos de la invitación

        // 6. Determinar el rol para el nuevo usuario a partir de los datos de la invitación
        // Si la invitación tiene un campo 'role', lo usamos; de lo contrario, por defecto es 'candidate'.
        const roleFromInvitation = invitationData?.role || "candidate";
        console.log(
          `Rol determinado para el nuevo usuario: ${roleFromInvitation}`
        );

        // 7. Crear el NUEVO documento del usuario en la colección 'users' con los datos iniciales
        // Usamos setDoc con merge: false (comportamiento por defecto si no existe)
        // Esto crea el documento si no existe. Si por alguna razón inesperada ya existiera, lo reemplaza (raro en este flujo).
        const newUserData = {
          dni: dni, // Guardamos el DNI proporcionado en este primer registro
          invitationCode: invitationCode, // Guardamos el código usado
          invitationDocId: invitationId, // Opcional: Guardar una referencia al documento de invitación
          role: roleFromInvitation, // ✅ Usamos el rol determinado de la invitación o el por defecto
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
          `Nuevo documento de usuario ${user.uid} creado con datos iniciales. Rol: ${roleFromInvitation}`
        );

        // Recargar los datos del usuario en el hook useAuth. Esto es fundamental
        // para que el componente padre (HomePageContent) detecte el nuevo documento
        // de usuario y su rol, y decida la vista apropiada (EmployeeForm o redirigir).
        if (reloadUserData) {
          await reloadUserData();
        }

        // 8. Lógica para nuevos usuarios (primera validación): Comportamiento condicional basado en el rol
        if (roleFromInvitation === "candidate") {
          // Si el nuevo usuario es un 'candidate', se le muestra un mensaje y se llama al callback
          // para que el componente padre cambie a mostrar el EmployeeForm.
          setMessage({
            type: "success",
            text: "Código validado. Por favor, completa tus datos.",
          });

          // Llama al callback onCodeValidated para que el componente padre renderice el EmployeeForm
          if (onCodeValidated) {
            onCodeValidated();
          } else {
            // Fallback: Si no se proporciona onCodeValidated, redirigimos a inicio (quizás no deseado)
            console.warn(
              "Login: onCodeValidated callback not provided for new candidate. Defaulting to redirect."
            );
            router.push("/");
          }
        } else {
          // Para CUALQUIER otro rol (distinto de 'candidate'), mostramos un mensaje de bienvenida
          // con su rol asignado y redirigimos directamente a la página principal.
          setMessage({
            type: "success",
            text: `¡Bienvenido! Tu rol asignado es: ${roleFromInvitation}. Accediendo...`,
          });

          // No llamamos a onCodeValidated. Simplemente redirigimos.
          router.push("/");
        }
      }
    } catch (error: unknown) {
      // Manejo general de errores (Firestore, red, etc.) durante el proceso de login/validación
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
      setIsLoading(false); // Finaliza el estado de carga, independientemente del éxito o error
    }
  };

  // Renderiza un spinner mientras la instancia de Firestore se inicializa en este componente
  if (!firebaseReady) {
    return (
      <Container className="text-center my-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Inicializando conexión a Firebase...</p>{" "}
        {/* Mensaje más descriptivo */}
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
}; // <-- Cierre de la función del componente Login

export default Login; // <-- Exportación por defecto

// src/components/HomePageContent.tsx
"use client"; // ¡¡¡Importante: Declara que este es un Client Component!!!

// Importa el hook personalizado para acceder al contexto de autenticación
import { useAuth } from "@/components/AuthProvider";

// Importa tus componentes de pantalla (Client Components o componentes sin estado)
import GoogleSignInPage from "./GoogleSignInPage";
import Login from "./Login";
import EmployeeForm from "./EmployeeForm";
import AdminDashboard from "./AdminDashboard";

// Importa componentes simples para carga y error (si los creaste como archivos separados)
import LoadingSpinner from "./LoadingSpinner"; // Asegúrate de que esta ruta sea correcta
import ErrorMessage from "./ErrorMessage"; // Asegúrate de que esta ruta sea correcta

// =============================================================================
// Componente Principal para Contenido Condicional de la Página Home
// =============================================================================
export default function HomePageContent() {
  // Consume todo el estado del usuario del contexto de autenticación
  // ¡Ahora incluimos setNeedsInvitationCode!
  const {
    user,
    userRole,
    needsInvitationCode,
    loadingUserStatus,
    hasError,
    errorDetails,
    isOnline, // Consumimos isOnline (aunque su impacto principal está en AuthProvider)
    setNeedsInvitationCode, // ¡¡¡Consumimos la función para actualizar el estado!!!
  } = useAuth();

  // --- Lógica de Renderizado Condicional ---
  // Basado en el estado obtenido del AuthProvider

  // 1. Estado de Carga Inicial
  // Si aún estamos cargando el estado inicial del usuario/rol
  if (loadingUserStatus) {
    return <LoadingSpinner />; // Muestra el componente de carga
  }

  // 2. Estado de Error
  // Si ocurrió un error al cargar el estado del usuario o interactuar con Firebase
  if (hasError) {
    return <ErrorMessage errorDetails={errorDetails} />; // Muestra el componente de error
  }

  // 3. Estado Offline Específico
  // Si el AuthProvider detectó que estamos offline Y ya terminó de cargar
  // Añadimos una UI específica para el modo offline.
  // userRole se establece a 'offline' en AuthProvider si !isOnline y no hay error.
  if (!isOnline && userRole === "offline") {
    // Puedes crear un componente específico para este mensaje si quieres
    return (
      <div className="alert alert-warning m-4 text-center">
        <h3>Modo Offline</h3>
        <p>
          No hay conexión a Internet. Algunas funcionalidades pueden no estar
          disponibles.
        </p>
        {/* Opcional: Mostrar estado del usuario si lo tienes en caché */}
        {user && <p>Usuario: {user.email}</p>}
      </div>
    );
  }

  // 4. Si no hay usuario autenticado (y no estamos en carga/error/offline explícito)
  if (!user) {
    // Renderiza la página de inicio de sesión con Google.
    // Pasamos la función de inicio de sesión con Google si la tienes implementada
    // en un archivo separado como '@/firebase/auth/clientAuth' y la exportas.
    // Puedes pasarla como prop a GoogleSignInPage o implementarla dentro.
    // Por ahora, GoogleSignInPage ya tiene su lógica interna handleGoogleSignIn.
    return <GoogleSignInPage />;
  }

  // 5. Si hay usuario y su rol es Admin
  if (userRole === "RRHH Admin" || userRole === "Admin Principal") {
    // Renderiza el Dashboard de Administrador
    return <AdminDashboard />;
  }

  // 6. Si hay usuario, no es Admin, y necesita validar el código (rol 'invitado' o similar)
  if (needsInvitationCode) {
    // Renderiza el componente de Login para ingresar DNI/Código.
    // isGoogleAuthenticated es true porque 'user' existe.
    // ¡¡¡Pasamos la función setNeedsInvitationCode para que el componente Login la llame al validar!!!
    return (
      <Login
        isGoogleAuthenticated={true}
        onCodeValidated={() => setNeedsInvitationCode(false)} // Pasa la función para actualizar el estado global
        // Si implementas el login de Google en un archivo aparte y quieres pasarlo, pásalo aquí:
        // onGoogleLoginClick={handleGoogleLogin} // Asumiendo que handleGoogleLogin está definida o pasada aquí
      />
    );
  }

  // 7. Si hay usuario, no es Admin, y NO necesita código (ya validó o no aplica)
  // Este es el caso de un empleado regular con acceso confirmado.
  // Es el renderizado "por defecto" si ninguna de las condiciones anteriores se cumple.
  return <EmployeeForm />; // Muestra el formulario del empleado
}

// Notas:
// - Este componente usa el hook useAuth, por lo tanto DEBE ser un Client Component ("use client").
// - No maneja la lógica de autenticación o fetching de datos directamente, sino que
//   la consume del AuthProvider.
// - Su rol es puramente de presentación condicional basada en el estado global.

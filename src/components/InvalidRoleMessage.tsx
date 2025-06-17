import { Container, Card, Button } from "react-bootstrap";
import { useAuth } from "@/components/AuthProvider"; // Importar useAuth en lugar de useAuthContext
import { getAuth, signOut } from "firebase/auth"; // Importar funciones de autenticación

export default function InvalidRoleMessage() {
  const { user, userRole } = useAuth(); // Usar useAuth en lugar de useAuthContext

  return (
    <Container className="mt-5">
      <Card className="text-center shadow">
        <Card.Header className="bg-danger text-white">
          <Card.Title>Acceso no autorizado</Card.Title>
        </Card.Header>
        <Card.Body>
          <Card.Text>
            Tu cuenta no tiene permisos para acceder a esta plataforma.
          </Card.Text>

          <Card.Text>
            <strong>Email:</strong> {user?.email}
            <br />
            <strong>Rol asignado:</strong> {userRole || "No asignado"}
          </Card.Text>

          <Card.Text className="mt-3">
            Si crees que esto es un error, contacta al administrador del
            sistema.
          </Card.Text>

          <Button
            variant="primary"
            className="mt-3"
            onClick={() => {
              // Lógica para cerrar sesión
              const auth = getAuth();
              signOut(auth);
            }}
          >
            Cerrar sesión
          </Button>
        </Card.Body>
      </Card>
    </Container>
  );
}

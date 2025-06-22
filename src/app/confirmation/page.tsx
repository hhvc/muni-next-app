// app/confirmation/page.tsx
"use client"; // Este componente necesita interactividad del cliente

import { Container, Card, Button, Row, Col } from "react-bootstrap";
import { useRouter } from "next/navigation"; // Para la navegación con Next.js App Router

const ConfirmationPage: React.FC = () => {
  const router = useRouter();

  const handleGoToDashboard = () => {
    // ¡IMPORTANTE! Necesito que me digas la ruta exacta para tu "CollaboratorDashboard".
    // Por ejemplo, si es "/dashboard", sería router.push("/dashboard");
    // Por ahora, pondré un placeholder. Por favor, sustituye esto con la ruta correcta.
    router.push("/ruta-a-tu-collaborator-dashboard"); // <--- ¡AQUÍ VA LA RUTA REAL!
  };

  const handleCloseApplication = () => {
    // Intentar cerrar la ventana/pestaña del navegador.
    // Nota: Por motivos de seguridad del navegador, window.close()
    // solo funciona en ventanas que fueron abiertas por script (ej. window.open()).
    // Si la pestaña no fue abierta por tu script, el navegador podría ignorar el comando
    // o pedir confirmación al usuario.
    window.close();
  };

  return (
    <Container
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "80vh" }}
    >
      <Card
        className="text-center shadow-lg p-4"
        style={{ maxWidth: "600px", width: "100%" }}
      >
        <Card.Header className="bg-success text-white">
          <Card.Title className="h4 mb-0">¡Envío Exitoso!</Card.Title>
        </Card.Header>
        <Card.Body>
          <p className="lead mt-3 mb-4">
            <span style={{ fontSize: "2em" }}>✅</span> Los datos se han
            guardado en forma correcta.
            <br />
            Si necesitas modificar tus datos contáctate con RRHH.
          </p>

          <Row className="mt-4 justify-content-center">
            <Col xs={12} md={6} className="mb-3">
              <Button
                variant="primary"
                size="lg"
                className="w-100"
                onClick={handleGoToDashboard}
              >
                Ir al Panel de Colaborador
              </Button>
            </Col>
            <Col xs={12} md={6}>
              <Button
                variant="secondary"
                size="lg"
                className="w-100"
                onClick={handleCloseApplication}
              >
                Cerrar Aplicación
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ConfirmationPage;

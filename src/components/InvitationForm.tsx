// src/components/InvitationForm.tsx

import React, { useState } from "react";
import { Form, Button, Alert, Spinner, Card } from "react-bootstrap";

interface InvitationFormProps {
  // Ahora la función onGenerateInvitation espera dni y key como argumentos opcionales
  onGenerateInvitation: (
    email: string,
    role: string,
    dni?: string, // DNI es opcional en la UI, pero el backend podría requerirlo
    key?: string // Clave/Contraseña es opcional en la UI
  ) => Promise<string>; // Promesa que resuelve a un string de mensaje de éxito
  generating: boolean; // Indica si la invitación se está generando (proceso en curso)
  availableRoles: string[]; // Array de roles disponibles para seleccionar en el formulario
}

const InvitationForm: React.FC<InvitationFormProps> = ({
  onGenerateInvitation,
  generating,
  availableRoles,
}) => {
  const [email, setEmail] = useState("");
  const [dni, setDni] = useState(""); // Nuevo estado para DNI
  const [key, setKey] = useState(""); // Nuevo estado para Clave/Contraseña
  const [role, setRole] = useState(availableRoles[0] || ""); // Por defecto, el primer rol disponible
  const [message, setMessage] = useState<{
    type: "success" | "danger";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null); // Limpiar mensajes anteriores

    if (!email || !role) {
      setMessage({
        type: "danger",
        text: "Email y Rol son campos requeridos.",
      });
      return;
    }

    try {
      // Llamar a la función prop, pasando los nuevos campos
      const successMessage = await onGenerateInvitation(email, role, dni, key);
      setMessage({
        type: "success",
        text:
          successMessage || `Invitación para ${email} generada exitosamente!`,
      });
      // Limpiar el formulario después del éxito
      setEmail("");
      setDni("");
      setKey("");
      setRole(availableRoles[0] || ""); // Restablecer al primer rol disponible
    } catch (error: unknown) {
      // 'error' es de tipo unknown
      console.error("Error al generar invitación desde el formulario:", error);
      let errorMessage = "Error al generar invitación. Inténtalo de nuevo.";

      // *** CORRECCIÓN CLAVE AQUÍ: Verificar el tipo de 'error' ***
      if (error instanceof Error) {
        // Ahora TypeScript sabe que 'error' es una instancia de Error, por lo tanto, tiene 'message'.
        errorMessage = error.message;
      } else if (typeof error === "string") {
        // Si el error es una cadena de texto directa
        errorMessage = error;
      }
      // Si tienes errores específicos de Firebase, también podrías añadir:
      // else if (error instanceof FirebaseError) { // Si FirebaseError es importado y relevante aquí
      //   errorMessage = error.message;
      // }

      setMessage({ type: "danger", text: errorMessage });
    }
  };

  return (
    <Card className="mt-4 shadow-sm">
      <Card.Header className="bg-primary text-white">
        <Card.Title className="h5 mb-0">Generar Nueva Invitación</Card.Title>
      </Card.Header>
      <Card.Body>
        {message && <Alert variant={message.type}>{message.text}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="formEmail">
            <Form.Label>Email del Invitado</Form.Label>
            <Form.Control
              type="email"
              placeholder="ingresa@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={generating}
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formDni">
            <Form.Label>DNI (Opcional)</Form.Label>
            <Form.Control
              type="text"
              placeholder="DNI del invitado"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              disabled={generating}
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formKey">
            <Form.Label>Clave / Contraseña (Opcional)</Form.Label>
            <Form.Control
              type="password" // Usar tipo password para ocultar la entrada
              placeholder="Clave de la invitación"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={generating}
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formRole">
            <Form.Label>Rol a Asignar</Form.Label>
            <Form.Select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              disabled={generating || availableRoles.length === 0}
            >
              {availableRoles.length === 0 ? (
                <option>No hay roles disponibles</option>
              ) : (
                availableRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))
              )}
            </Form.Select>
            {availableRoles.length === 0 && (
              <Form.Text className="text-danger">
                Define roles en INVITE_ROLES en HRDashboard.tsx
              </Form.Text>
            )}
          </Form.Group>

          <Button
            variant="success"
            type="submit"
            disabled={generating}
            className="w-100"
          >
            {generating ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Generando...
              </>
            ) : (
              "Generar Invitación"
            )}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default InvitationForm;

// src/components/InvitationForm.tsx

import React, { useState } from "react";
import { Form, Button, Alert, Spinner, Card } from "react-bootstrap";
// 🎯 Importamos 'Timestamp' desde el SDK de cliente de Firebase para tipar correctamente
import { Timestamp } from "firebase/firestore";

// 🎯 CAMBIO CLAVE 1:
// Definimos la interfaz que coincide con el objeto que tu Cloud Function
// 'generateInvitation' ahora devuelve. Es crucial que 'createdAt' sea de tipo Timestamp.
interface GeneratedInvitationResponse {
  id: string; // El ID del documento de invitación recién creado
  dni: string;
  code: string;
  role: string;
  createdAt: Timestamp; // Ahora sabemos que este será un objeto Timestamp de Firestore
  createdBy: string;
  used: boolean;
  usedAt?: Timestamp; // Opcional, si lo manejas en el futuro
  usedBy?: string; // Opcional, si lo manejas en el futuro
}

interface InvitationFormProps {
  // 🎯 CAMBIO CLAVE 2:
  // onGenerateInvitation ahora resuelve a una promesa de tipo GeneratedInvitationResponse
  onGenerateInvitation: (
    dni: string,
    code: string,
    role: string
  ) => Promise<GeneratedInvitationResponse>; // <--- ¡Tipo de retorno actualizado!
  generating: boolean; // Indica si la invitación se está generando (proceso en curso)
  availableRoles: string[]; // Array de roles disponibles para seleccionar en el formulario
}

const InvitationForm: React.FC<InvitationFormProps> = ({
  onGenerateInvitation,
  generating,
  availableRoles,
}) => {
  // const [email, setEmail] = useState(""); // <-- Correcto, este estado ya no es necesario

  const [dni, setDni] = useState(""); // Estado para DNI (ahora obligatorio)
  const [code, setcode] = useState(""); // Estado para Clave/Contraseña (ahora obligatorio)
  const [role, setRole] = useState(availableRoles[0] || ""); // Por defecto, el primer rol disponible
  const [message, setMessage] = useState<{
    type: "success" | "danger";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null); // Limpiar mensajes anteriores

    // Validación para DNI, Clave y Rol
    if (!dni || !code || !role) {
      setMessage({
        type: "danger",
        text: "DNI, Clave y Rol son campos requeridos.",
      });
      return;
    }

    try {
      // 🎯 CAMBIO CLAVE 3:
      // Ahora 'generatedInvitation' será el objeto completo devuelto por la Cloud Function
      const generatedInvitation = await onGenerateInvitation(dni, code, role); // <--- Capturamos el objeto completo

      setMessage({
        type: "success",
        // 🎯 CAMBIO CLAVE 4:
        // Usamos los datos del objeto retornado para construir el mensaje de éxito.
        // Esto es más robusto y específico.
        text: `Invitación para DNI: ${generatedInvitation.dni} (ID: ${generatedInvitation.id}) generada exitosamente!`,
      });

      // Limpiar el formulario después del éxito
      setDni("");
      setcode("");
      setRole(availableRoles[0] || ""); // Restablecer al primer rol disponible
    } catch (error: unknown) {
      console.error("Error al generar invitación desde el formulario:", error);
      let errorMessage = "Error al generar invitación. Inténtalo de nuevo.";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

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
          {/* El campo de Email del Invitado ya ha sido eliminado, lo cual es correcto */}

          <Form.Group className="mb-3" controlId="formDni">
            <Form.Label>DNI</Form.Label>
            <Form.Control
              type="text"
              placeholder="DNI del invitado"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              required
              disabled={generating}
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formcode">
            <Form.Label>Clave / Contraseña</Form.Label>
            <Form.Control
              type="password" // Usar tipo password para ocultar la entrada
              placeholder="Clave de la invitación"
              value={code}
              onChange={(e) => setcode(e.target.value)}
              required
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

// src/components/dashboard/InvitationForm.tsx
import React, { useState } from "react";
import { Form, Button, Spinner, Alert } from "react-bootstrap";

interface InvitationFormProps {
  onGenerateInvitation: (email: string, role: string) => Promise<void>;
  generating: boolean;
  availableRoles: string[]; // Roles disponibles para asignar a invitados (ej: ["user"])
}

const InvitationForm: React.FC<InvitationFormProps> = ({
  onGenerateInvitation,
  generating,
  availableRoles,
}) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(availableRoles[0] || "user"); // Rol por defecto, el primero de la lista
  const [message, setMessage] = useState<{
    type: "success" | "danger";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      await onGenerateInvitation(email, role); // Llama al handler pasado por props
      setMessage({
        type: "success",
        text: `Invitación a ${email} generada exitosamente!`,
      });
      setEmail(""); // Limpiar campo
    } catch (err) {
      console.error("Error generando invitación en InvitationForm:", err);
      setMessage({
        type: "danger",
        text: `Error al generar invitación: ${
          err instanceof Error ? err.message : String(err)
        }`,
      });
    }
  };

  return (
    <Form onSubmit={handleSubmit} className="mt-3">
      <h3>Generar Nueva Invitación</h3>
      {message && <Alert variant={message.type}>{message.text}</Alert>}
      <Form.Group className="mb-3" controlId="inviteEmail">
        <Form.Label>Email a Invitar</Form.Label>
        <Form.Control
          type="email"
          placeholder="ejemplo@dominio.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={generating}
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="inviteRole">
        <Form.Label>Rol para Asignar</Form.Label>
        <Form.Select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={generating}
        >
          {/* Renderiza los roles disponibles pasados por props */}
          {availableRoles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Form.Select>
      </Form.Group>
      <Button variant="primary" type="submit" disabled={generating}>
        {generating ? (
          <Spinner animation="border" size="sm" className="me-2" />
        ) : null}
        {generating ? "Generando..." : "Generar Invitación"}
      </Button>
    </Form>
  );
};

export default InvitationForm;

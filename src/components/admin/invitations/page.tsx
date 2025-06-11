// src/app/admin/invitations/page.tsx
"use client";

import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import InvitationGenerator from "@/components/admin/InvitationGenerator";
import InvitationsList from "@/components/admin/InvitationsList";
import { useAuth } from "@/components/AuthProvider";
import Unauthorized from "@/components/Unauthorized";

const InvitationsPage = () => {
  const { userRole } = useAuth();

  if (!["RRHH Admin", "Admin Principal"].includes(userRole || "")) {
    return <Unauthorized />;
  }

  return (
    <Container className="py-5">
      <h1 className="mb-4">Gestión de Invitaciones</h1>

      <Row>
        <Col md={6} className="mb-4">
          <InvitationGenerator />
        </Col>

        <Col md={6}>
          <h3 className="mb-3">Invitaciones Generadas</h3>
          <InvitationsList />
        </Col>
      </Row>
    </Container>
  );
};

export default InvitationsPage;

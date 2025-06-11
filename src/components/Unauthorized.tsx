// src/components/Unauthorized.tsx
"use client";
import React from "react";
import { Container, Alert } from "react-bootstrap";

const Unauthorized: React.FC = () => (
  <Container className="mt-5">
    <Alert variant="warning">No tienes permiso para ver esta página.</Alert>
  </Container>
);

export default Unauthorized;

"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/clientApp";
import {
  Container,
  Card,
  Row,
  Col,
  Button,
  Spinner,
  Alert,
} from "react-bootstrap";
import { useRouter } from "next/navigation";

interface Empleado {
  id: string;
  nombre?: string;
  apellido?: string;
  dni?: string;
  email?: string;
  telefono?: string;
  fechaNacimiento?: string;
  genero?: string;
  estadoCivil?: string;
  direccion?: string;
  personalData?: {
    nombre: string;
    apellido: string;
    dni: string;
    mail: string;
    telefono: string;
    fechaNacimiento?: string;
    genero?: string;
    estadoCivil?: string;
    direccion?: string;
    cuil?: string;
    telefonoAlternativo?: string;
  };
  createdAt?: {
    toDate: () => Date;
  };
}

export default function DetalleEmpleadoClient({ id }: { id: string }) {
  const router = useRouter();
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmpleado = async () => {
      if (!id) return;

      try {
        const docRef = doc(db, "employee-data", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setEmpleado({
            id: docSnap.id,
            personalData: {
              nombre: data.personalData?.nombre || "",
              apellido: data.personalData?.apellido || "",
              dni: data.personalData?.dni || "",
              mail: data.personalData?.mail || "",
              telefono: data.personalData?.telefono || "",
              fechaNacimiento: data.personalData?.fechaNacimiento || "",
              genero: data.personalData?.genero || "",
              estadoCivil: data.personalData?.estadoCivil || "",
              direccion: data.personalData?.direccion || "",
              cuil: data.personalData?.cuil || "",
              telefonoAlternativo: data.personalData?.telefonoAlternativo || "",
            },
            createdAt: data.createdAt
              ? { toDate: () => data.createdAt.toDate() }
              : undefined,
          });
        } else {
          setEmpleado(null);
        }
      } catch (e) {
        console.error(e);
        setEmpleado(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEmpleado();
  }, [id]);

  if (loading) {
    return (
      <Container className="text-center my-5">
        <Spinner animation="border" />
        <p>Cargando información del empleado...</p>
      </Container>
    );
  }

  if (!empleado) {
    return (
      <Container className="my-5">
        <Alert variant="danger">No se encontró el empleado solicitado</Alert>
      </Container>
    );
  }

  const display = (campo?: string) => campo || "N/A";

  return (
    <Container className="my-5">
      <Button
        variant="secondary"
        onClick={() => router.back()}
        className="mb-4"
      >
        &larr; Volver al listado
      </Button>

      <Card>
        <Card.Header className="bg-primary text-white">
          <Card.Title>Detalles del Empleado</Card.Title>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <h5>Información Personal</h5>
              <p>
                <strong>Nombre:</strong>{" "}
                {display(empleado.personalData?.nombre)}
              </p>
              <p>
                <strong>Apellido:</strong>{" "}
                {display(empleado.personalData?.apellido)}
              </p>
              <p>
                <strong>DNI:</strong> {display(empleado.personalData?.dni)}
              </p>
              <p>
                <strong>Fecha de Nacimiento:</strong>{" "}
                {display(empleado.personalData?.fechaNacimiento)}
              </p>
              <p>
                <strong>Género:</strong>{" "}
                {display(empleado.personalData?.genero)}
              </p>
              <p>
                <strong>Estado Civil:</strong>{" "}
                {display(empleado.personalData?.estadoCivil)}
              </p>
            </Col>
            <Col md={6}>
              <h5>Información de Contacto</h5>
              <p>
                <strong>Email:</strong> {display(empleado.personalData?.mail)}
              </p>
              <p>
                <strong>Teléfono:</strong>{" "}
                {display(empleado.personalData?.telefono)}
              </p>
              <p>
                <strong>Dirección:</strong>{" "}
                {display(empleado.personalData?.direccion)}
              </p>
              <h5 className="mt-4">Información Adicional</h5>
              <p>
                <strong>Fecha de Registro:</strong>
                {empleado.createdAt
                  ? empleado.createdAt.toDate().toLocaleDateString()
                  : "N/A"}
              </p>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
}

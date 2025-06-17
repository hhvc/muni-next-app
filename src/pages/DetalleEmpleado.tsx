// src/pages/empleados/[id].tsx
import { useRouter } from "next/router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/clientApp";
import { useEffect, useState } from "react";
import {
  Container,
  Card,
  Row,
  Col,
  Button,
  Spinner,
  Alert,
} from "react-bootstrap";

interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string;
  fechaNacimiento?: string;
  genero?: string;
  estadoCivil?: string;
  direccion?: string;
  createdAt?: {
    toDate: () => Date;
  };
}

const DetalleEmpleado = () => {
  const router = useRouter();
  const { id } = router.query;
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmpleado = async () => {
      if (!id) return;

      try {
        const docRef = doc(db, "employee-data", id as string);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setEmpleado({ id: docSnap.id, ...docSnap.data() } as Empleado);
        } else {
          console.log("No such document!");
        }
      } catch (error) {
        console.error("Error fetching employee:", error);
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
                <strong>Nombre:</strong> {empleado.nombre}
              </p>
              <p>
                <strong>Apellido:</strong> {empleado.apellido}
              </p>
              <p>
                <strong>DNI:</strong> {empleado.dni}
              </p>
              <p>
                <strong>Fecha de Nacimiento:</strong>{" "}
                {empleado.fechaNacimiento || "N/A"}
              </p>
              <p>
                <strong>Género:</strong> {empleado.genero || "N/A"}
              </p>
              <p>
                <strong>Estado Civil:</strong> {empleado.estadoCivil || "N/A"}
              </p>
            </Col>
            <Col md={6}>
              <h5>Información de Contacto</h5>
              <p>
                <strong>Email:</strong> {empleado.email}
              </p>
              <p>
                <strong>Teléfono:</strong> {empleado.telefono}
              </p>
              <p>
                <strong>Dirección:</strong> {empleado.direccion || "N/A"}
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
};

export default DetalleEmpleado;

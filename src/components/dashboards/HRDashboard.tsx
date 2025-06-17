// src/components/dashboard/HRDashboard.tsx
import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Table,
  Form,
  Button,
  InputGroup,
  Spinner,
  Alert,
} from "react-bootstrap";
import { db } from "@/firebase/clientApp";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import Link from "next/link";

interface Employee {
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
  createdAt: Date | null;
}

const HRDashboard: React.FC = () => {
  const [empleados, setEmpleados] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState<keyof Employee>("dni");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDbInitialized, setIsDbInitialized] = useState(false);

  // Verificar inicialización de Firebase
  useEffect(() => {
    if (db) {
      setIsDbInitialized(true);
    } else {
      const intervalId = setInterval(() => {
        if (db) {
          setIsDbInitialized(true);
          clearInterval(intervalId);
        }
      }, 500);

      const timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        if (!db) {
          setError("Firebase no se inicializó en el tiempo esperado");
        }
      }, 10000);

      return () => {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
      };
    }
  }, []);

  // Cargar empleados desde Firestore
  useEffect(() => {
    const fetchEmpleados = async () => {
      if (!isDbInitialized || !db) return;

      setLoading(true);
      setError(null);

      try {
        // Construir consulta base para employee-data
        let q;
        if (searchTerm) {
          // Búsqueda parcial
          q = query(
            collection(db, "employee-data"),
            where(searchField, ">=", searchTerm),
            where(searchField, "<=", searchTerm + "\uf8ff"),
            orderBy(searchField)
          );
        } else {
          q = query(collection(db, "employee-data"), orderBy("apellido"));
        }

        const querySnapshot = await getDocs(q);
        const empleadosData: Employee[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          empleadosData.push({
            id: doc.id,
            nombre: data.nombre || "",
            apellido: data.apellido || "",
            dni: data.dni || "",
            email: data.email || "",
            telefono: data.telefono || "",
            fechaNacimiento: data.fechaNacimiento || "",
            genero: data.genero || "",
            estadoCivil: data.estadoCivil || "",
            direccion: data.direccion || "",
            createdAt: data.createdAt?.toDate() || null,
          });
        });

        setEmpleados(empleadosData);
      } catch (err) {
        console.error("Error cargando empleados:", err);

        let errorMessage = "Error al cargar los empleados";
        if (err instanceof FirebaseError) {
          errorMessage += `: ${err.message}`;
        } else if (err instanceof Error) {
          errorMessage += `: ${err.message}`;
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchEmpleados();
  }, [isDbInitialized, searchTerm, searchField]);

  // Descargar datos como CSV
  const handleDownload = () => {
    try {
      // Encabezados
      const headers = [
        "#",
        "Nombre",
        "Apellido",
        "DNI",
        "Email",
        "Teléfono",
        "Fecha de Nacimiento",
        "Género",
        "Estado Civil",
        "Fecha de Registro",
      ];

      // Datos
      const rows = empleados.map((empleado, index) => [
        (index + 1).toString(),
        `"${empleado.nombre}"`,
        `"${empleado.apellido}"`,
        `"${empleado.dni}"`,
        `"${empleado.email}"`,
        `"${empleado.telefono}"`,
        `"${empleado.fechaNacimiento || "N/A"}"`,
        `"${empleado.genero || "N/A"}"`,
        `"${empleado.estadoCivil || "N/A"}"`,
        `"${empleado.createdAt?.toLocaleDateString() || "N/A"}"`,
      ]);

      // Crear contenido CSV
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      // Crear blob y descargar
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute("download", "empleados.csv");
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error generando CSV:", error);
      setError("Error al generar el archivo de descarga");
    }
  };

  // Manejar errores de inicialización
  if (error) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">
          <strong>Error:</strong> {error}
          <div className="mt-3">
            <Button variant="primary" onClick={() => window.location.reload()}>
              Recargar página
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  // Si Firebase no está inicializado
  if (!isDbInitialized) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Inicializando base de datos...</p>
      </Container>
    );
  }

  return (
    <Container className="mt-5">
      <Row className="mb-3">
        <Col>
          <h2>Listado de Empleados</h2>
        </Col>
      </Row>

      {/* Sección de Búsqueda */}
      <Row className="mb-3">
        <Col xs lg="8">
          <InputGroup>
            <Form.Control
              type="text"
              placeholder={`Buscar por ${
                searchField === "dni" ? "DNI" : searchField
              }...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Form.Select
              aria-label="Campo de búsqueda"
              value={searchField}
              onChange={(e) => setSearchField(e.target.value as keyof Employee)}
            >
              <option value="dni">DNI</option>
              <option value="nombre">Nombre</option>
              <option value="apellido">Apellido</option>
              <option value="email">Email</option>
            </Form.Select>
            <Button variant="primary" disabled={loading}>
              Buscar
            </Button>
          </InputGroup>
        </Col>
        <Col className="d-flex justify-content-end">
          <Button
            variant="success"
            onClick={handleDownload}
            disabled={empleados.length === 0 || loading}
          >
            <i className="bi bi-download me-2"></i>
            Descargar CSV
          </Button>
        </Col>
      </Row>

      {/* Estado de carga */}
      {loading && (
        <Row className="mb-3">
          <Col className="text-center">
            <Spinner animation="border" variant="primary" />
            <p>Cargando empleados...</p>
          </Col>
        </Row>
      )}

      {/* Tabla de Empleados */}
      <Row>
        <Col>
          <Table striped bordered hover responsive className="mt-3">
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>DNI</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {empleados.map((empleado, index) => (
                <tr key={empleado.id}>
                  <td>{index + 1}</td>
                  <td>{empleado.nombre}</td>
                  <td>{empleado.apellido}</td>
                  <td>{empleado.dni}</td>
                  <td>{empleado.email}</td>
                  <td>{empleado.telefono}</td>
                  <td>
                    <Link href={`/empleados/${empleado.id}`} passHref>
                      <Button variant="outline-primary" size="sm">
                        <i className="bi bi-eye me-1"></i>
                        Ver Detalles
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {empleados.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="text-center">
                    No se encontraron empleados
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Col>
      </Row>
    </Container>
  );
};

export default HRDashboard;

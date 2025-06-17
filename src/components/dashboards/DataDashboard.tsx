// src/components/dashboard/DataDashboard.tsx
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

interface Candidato {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  mail: string;
  telefono: string;
  createdAt: Date | null;
}

const DataDashboard: React.FC = () => {
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState<keyof Candidato>("dni");
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

  // Cargar candidatos desde Firestore
  useEffect(() => {
    const fetchCandidatos = async () => {
      if (!isDbInitialized || !db) return;

      setLoading(true);
      setError(null);

      try {
        // Construir consulta base
        let q;
        if (searchTerm) {
          // Búsqueda parcial: usamos >= y <= para simular 'contiene'
          q = query(
            collection(db, "candidatos"),
            where(searchField, ">=", searchTerm),
            where(searchField, "<=", searchTerm + "\uf8ff"),
            orderBy(searchField)
          );
        } else {
          q = query(collection(db, "candidatos"), orderBy("apellido"));
        }

        const querySnapshot = await getDocs(q);
        const candidatosData: Candidato[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          candidatosData.push({
            id: doc.id,
            nombre: data.nombre || "",
            apellido: data.apellido || "",
            dni: data.dni || "",
            mail: data.mail || "",
            telefono: data.telefono || "",
            createdAt: data.createdAt?.toDate() || null,
          });
        });

        setCandidatos(candidatosData);
      } catch (err) {
        console.error("Error cargando candidatos:", err);

        let errorMessage = "Error al cargar los candidatos";
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

    fetchCandidatos();
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
        "Fecha de Registro",
      ];

      // Datos
      const rows = candidatos.map((candidato, index) => [
        (index + 1).toString(),
        `"${candidato.nombre}"`,
        `"${candidato.apellido}"`,
        `"${candidato.dni}"`,
        `"${candidato.mail}"`,
        `"${candidato.telefono}"`,
        `"${candidato.createdAt?.toLocaleDateString() || "N/A"}"`,
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
      link.setAttribute("download", "candidatos.csv");
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error generando CSV:", error);
      setError("Error al generar el archivo de descarga");
    }
  };

  // Ver detalles del candidato
  const handleViewDetails = (candidatoId: string) => {
    console.log("Ver detalles del candidato:", candidatoId);
    // Aquí implementarías la navegación a la página de detalles
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
          <h2>Listado de Candidatos</h2>
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
              onChange={(e) =>
                setSearchField(e.target.value as keyof Candidato)
              }
            >
              <option value="dni">DNI</option>
              <option value="nombre">Nombre</option>
              <option value="apellido">Apellido</option>
              <option value="mail">Email</option>
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
            disabled={candidatos.length === 0 || loading}
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
            <p>Cargando candidatos...</p>
          </Col>
        </Row>
      )}

      {/* Tabla de Candidatos */}
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
                <th>Fecha de Registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {candidatos.map((candidato, index) => (
                <tr key={candidato.id}>
                  <td>{index + 1}</td>
                  <td>{candidato.nombre}</td>
                  <td>{candidato.apellido}</td>
                  <td>{candidato.dni}</td>
                  <td>{candidato.mail}</td>
                  <td>{candidato.telefono}</td>
                  <td>{candidato.createdAt?.toLocaleDateString() || "N/A"}</td>
                  <td>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handleViewDetails(candidato.id)}
                    >
                      <i className="bi bi-eye me-1"></i>
                      Ver
                    </Button>
                  </td>
                </tr>
              ))}
              {candidatos.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="text-center">
                    No se encontraron candidatos
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

export default DataDashboard;

import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Table,
  Form,
  Button,
  InputGroup,
} from "react-bootstrap";
// Importamos Firestore para obtener los datos de los candidatos más adelante
// import { db } from '../firebase';
// Importamos funciones de Firestore para consultas (necesarias para la búsqueda)
// import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

interface Candidato {
  id: string; // ID del documento en Firestore
  nombre: string;
  apellido: string;
  dni: string;
  // Agrega aquí el resto de los campos personales que vas a mostrar en la tabla
  mail: string;
  telefono: string;
  // ...
  // Puedes agregar un campo para indicar si adjuntaron todos los archivos, etc.
}

const AdminDashboard: React.FC = () => {
  // Estado para almacenar la lista de candidatos
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  // Estado para el término de búsqueda
  const [searchTerm, setSearchTerm] = useState("");
  // Estado para el campo de búsqueda seleccionado (DNI, Nombre, Apellido)
  const [searchField, setSearchField] = useState("dni"); // Valor por defecto

  // TODO: Implementar lógica para cargar candidatos desde Firestore cuando el componente se monte
  useEffect(() => {
    // Aquí iría la llamada a Firebase Firestore para obtener la lista inicial de candidatos
    // Una consulta básica podría ser: query(collection(db, "candidatos"), orderBy("apellido"));
    // Los resultados se guardarían en el estado `candidatos` usando `setCandidatos`.
    // Por ahora, usaremos datos dummy para que veas la tabla.

    const dummyCandidatos: Candidato[] = [
      {
        id: "1",
        nombre: "Juan",
        apellido: "Perez",
        dni: "12345678",
        mail: "juan.p@example.com",
        telefono: "111-222",
      },
      {
        id: "2",
        nombre: "Maria",
        apellido: "Gomez",
        dni: "87654321",
        mail: "maria.g@example.com",
        telefono: "333-444",
      },
      // Agrega más datos dummy si quieres probar el scroll o la búsqueda con datos locales
    ];
    setCandidatos(dummyCandidatos);
  }, []); // El array vacío [] asegura que este efecto se ejecute solo una vez al montar

  // TODO: Implementar lógica para buscar candidatos en Firestore
  const handleSearch = async () => {
    console.log(`Buscando "${searchTerm}" por "${searchField}"`);
    // Aquí iría la lógica para hacer una consulta a Firestore filtrando por searchField y searchTerm.
    // Ejemplo: query(collection(db, "candidatos"), where(searchField, "==", searchTerm));
    // Actualiza el estado `candidatos` con los resultados de la búsqueda.

    // Lógica de filtrado simple en memoria para datos dummy (QUITAR CUANDO USES FIRESTORE)
    const filtered = candidatos.filter((c) =>
      c[searchField as keyof Candidato]
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
    setCandidatos(filtered); // Esto filtrará los datos dummy
  };

  // TODO: Implementar lógica para descargar la tabla
  const handleDownload = () => {
    console.log("Descargar datos de la tabla");
    // Aquí iría la lógica para tomar los datos actuales en el estado `candidatos`
    // y formatearlos (por ejemplo, como CSV) para descargar.
    // Necesitarías generar un archivo y ofrecerlo para descarga.
  };

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
              placeholder={`Buscar por ${searchField}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Form.Select
              aria-label="Campo de búsqueda"
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
            >
              <option value="dni">DNI</option>
              <option value="nombre">Nombre</option>
              <option value="apellido">Apellido</option>
            </Form.Select>
            <Button variant="primary" onClick={handleSearch}>
              Buscar
            </Button>
          </InputGroup>
        </Col>
        <Col className="d-flex justify-content-end">
          {" "}
          {/* Alinea el botón a la derecha */}
          <Button variant="secondary" onClick={handleDownload}>
            Descargar Tabla
          </Button>
        </Col>
      </Row>

      {/* Tabla de Candidatos */}
      <Row>
        <Col>
          <Table striped bordered hover responsive>
            {" "}
            {/* responsive hace la tabla scrollable en pantallas pequeñas */}
            <thead>
              <tr>
                <th>#</th> {/* O podrías mostrar el ID si es relevante */}
                <th>Nombre</th>
                <th>Apellido</th>
                <th>DNI</th>
                <th>Mail</th>
                <th>Teléfono</th>
                {/* Agrega encabezados para los otros campos personales que muestres */}
                {/* <th>Archivos Adjuntos Completos?</th> */}
                {/* Agrega una columna para ver/descargar archivos individuales */}
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
                  {/* Renderiza los otros campos aquí */}
                  <td>
                    <Button variant="outline-info" size="sm" className="me-2">
                      Ver Detalles
                    </Button>{" "}
                    {/* Para ver datos individuales */}
                    {/* <Button variant="outline-secondary" size="sm">Descargar Archivos</Button> */}{" "}
                    {/* Para descargar todos los archivos del candidato */}
                  </td>
                </tr>
              ))}
              {candidatos.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center">
                    No hay candidatos para mostrar.
                  </td>{" "}
                  {/* Ajusta colSpan */}
                </tr>
              )}
            </tbody>
          </Table>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminDashboard;

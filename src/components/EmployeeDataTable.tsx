// src/components/dashboard/EmployeeDataTable.tsx
import React from "react";
import {
  Table,
  Form,
  Button,
  InputGroup,
  Spinner,
  Alert,
  Row,
  Col,
} from "react-bootstrap";
import Link from "next/link";
import { EmployeeDataRecord } from "@/types/dashboardTypes"; // Importa tu interfaz de empleado

// Define los campos de búsqueda con sus rutas de acceso completas
// ¡Añade la palabra clave 'export' aquí!
export type EmployeeSearchField =
  | "personalData.dni"
  | "personalData.nombre"
  | "personalData.apellido"
  | "personalData.mail";

interface EmployeeDataTableProps {
  employees: EmployeeDataRecord[];
  loading: boolean;
  error: string | null;
  // onSearchChange ahora toma un campo con la ruta completa (ej: 'personalData.dni')
  onSearchChange: (term: string, field: EmployeeSearchField) => void;
  onDownload: () => void;
  searchTerm: string;
  // searchField ahora es del nuevo tipo EmployeeSearchField
  searchField: EmployeeSearchField;
  hasData: boolean;
}

const EmployeeDataTable: React.FC<EmployeeDataTableProps> = ({
  employees,
  loading,
  error,
  onSearchChange,
  onDownload,
  searchTerm,
  searchField,
  hasData,
}) => {
  if (loading)
    return (
      <div className="text-center my-4">
        <Spinner animation="border" size="sm" /> Cargando datos de empleados...
      </div>
    );
  if (error)
    return (
      <Alert variant="danger">Error cargando datos de empleados: {error}</Alert>
    );

  const employeeSearchFields: { value: EmployeeSearchField; label: string }[] =
    [
      { value: "personalData.dni", label: "DNI" },
      { value: "personalData.nombre", label: "Nombre" },
      { value: "personalData.apellido", label: "Apellido" },
      { value: "personalData.mail", label: "Email" }, // Corregido a personalData.mail
    ];

  return (
    <>
      <Row className="mb-3">
        <Col xs lg="8">
          <InputGroup>
            <Form.Control
              type="text"
              placeholder={`Buscar por ${
                employeeSearchFields.find((f) => f.value === searchField)
                  ?.label || searchField
              }...`}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value, searchField)}
            />
            <Form.Select
              aria-label="Campo de búsqueda"
              value={searchField}
              onChange={(e) =>
                onSearchChange(
                  searchTerm,
                  e.target.value as EmployeeSearchField
                )
              }
            >
              {employeeSearchFields.map((field) => (
                <option key={field.value} value={field.value}>
                  {field.label}
                </option>
              ))}
            </Form.Select>
            <Button
              variant="primary"
              disabled={loading}
              onClick={() => onSearchChange(searchTerm, searchField)}
            >
              Buscar
            </Button>
          </InputGroup>
        </Col>
        <Col className="d-flex justify-content-end">
          <Button
            variant="success"
            onClick={onDownload}
            disabled={!hasData || loading}
          >
            <i className="bi bi-download me-2"></i>
            Descargar CSV
          </Button>
        </Col>
      </Row>

      <Table striped bordered hover responsive className="mt-3">
        <thead>
          <tr>
            <th>#</th>
            <th>Nombre</th>
            <th>Apellido</th>
            <th>DNI</th>
            <th>Email</th>
            <th>Teléfono</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee, index) => (
            <tr key={employee.id}>
              <td>{index + 1}</td>
              <td>{employee.personalData.nombre}</td>
              <td>{employee.personalData.apellido}</td>
              <td>{employee.personalData.dni}</td>
              <td>{employee.personalData.mail}</td>
              <td>{employee.personalData.telefono}</td>
              <td>{employee.status}</td>
              <td>
                <Link href={`/empleados/${employee.id}`} passHref>
                  <Button variant="outline-primary" size="sm">
                    <i className="bi bi-eye me-1"></i>
                    Ver Detalles
                  </Button>
                </Link>
              </td>
            </tr>
          ))}
          {employees.length === 0 && !loading && (
            <tr>
              <td colSpan={8} className="text-center">
                No se encontraron registros de empleados
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </>
  );
};

export default EmployeeDataTable;

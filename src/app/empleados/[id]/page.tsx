// app/empleados/[id]/page.tsx
"use client"; // Necesario porque usa useState y useEffect

import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/clientApp"; // Asegúrate de que esta ruta sea correcta
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
import { useRouter } from "next/navigation"; // Importar useRouter de next/navigation para App Router

interface Empleado {
  id: string;
  // Estos campos raíz (nombre, apellido, etc.) DEBERÍAN refactorizarse
  // para que toda la información personal esté ANIDADA bajo 'personalData',
  // si así es como la tienes en Firestore.
  // Por ahora, los mantengo para compatibilidad, pero la idea es usar `personalData`.
  nombre?: string;
  apellido?: string;
  dni?: string;
  email?: string; // Si lo tienes a nivel raíz (no recomendado si ya está en personalData)
  telefono?: string; // Si lo tienes a nivel raíz
  fechaNacimiento?: string; // Si lo tienes a nivel raíz
  genero?: string; // Si lo tienes a nivel raíz
  estadoCivil?: string; // Si lo tienes a nivel raíz
  direccion?: string; // Si lo tienes a nivel raíz

  // --- ¡Ajuste CRUCIAL aquí! ---
  // Esta interfaz refleja cómo está tu objeto 'personalData' en Firestore
  personalData?: {
    nombre: string;
    apellido: string;
    dni: string;
    // --- ¡Cambiado 'email' a 'mail' aquí! ---
    mail: string; // <-- Corregido para coincidir con tus datos de Firestore
    // --- Fin del cambio ---
    telefono: string;
    fechaNacimiento?: string;
    genero?: string;
    estadoCivil?: string;
    direccion?: string;
    cuil?: string; // Añadido si lo tienes en personalData
    telefonoAlternativo?: string; // Añadido si lo tienes en personalData
  };
  // --- Fin del ajuste CRUCIAL ---

  createdAt?: {
    toDate: () => Date;
  };
  // Agrega cualquier otro campo raíz que exista en tu documento de Firestore.
}

// Los parámetros de la ruta se pasan como props al componente de la página
interface DetalleEmpleadoProps {
  params: {
    id: string; // El valor dinámico de [id] se pasará aquí
  };
}

const DetalleEmpleado: React.FC<DetalleEmpleadoProps> = ({ params }) => {
  const router = useRouter(); // Aún necesitas useRouter para router.back()
  const { id } = params; // Obtener el ID directamente de params

  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmpleado = async () => {
      if (!id) return; // Se debería pasar siempre, pero es una buena práctica

      try {
        const docRef = doc(db, "employee-data", id as string);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const dataFromFirestore = docSnap.data();
          // Mapea los datos del documento a la interfaz Empleado
          setEmpleado({
            id: docSnap.id,
            // Si tus datos personales están ANIDADOS bajo 'personalData' en Firestore,
            // asegúrate de mapear el OBJETO COMPLETO.
            personalData: {
              // Asegura que este objeto existe y mapea todos sus campos
              nombre: dataFromFirestore.personalData?.nombre || "",
              apellido: dataFromFirestore.personalData?.apellido || "",
              dni: dataFromFirestore.personalData?.dni || "",
              mail: dataFromFirestore.personalData?.mail || "", // <-- Accediendo a 'mail'
              telefono: dataFromFirestore.personalData?.telefono || "",
              fechaNacimiento:
                dataFromFirestore.personalData?.fechaNacimiento || "",
              genero: dataFromFirestore.personalData?.genero || "",
              estadoCivil: dataFromFirestore.personalData?.estadoCivil || "",
              direccion: dataFromFirestore.personalData?.direccion || "",
              cuil: dataFromFirestore.personalData?.cuil || "",
              telefonoAlternativo:
                dataFromFirestore.personalData?.telefonoAlternativo || "",
            },
            // Mapea los campos que estén a nivel raíz del documento (si los hay)
            createdAt: dataFromFirestore.createdAt // Asumo que ya viene como Timestamp que tiene toDate()
              ? { toDate: () => dataFromFirestore.createdAt.toDate() }
              : undefined,
            // Si tienes 'nombre', 'apellido', etc. también a nivel raíz Y en personalData,
            // decide cuál es la fuente de verdad o combínalos.
            // Para este ejemplo, asumo que la fuente principal es 'personalData'.
          } as Empleado);
        } else {
          console.log("No such document!");
          setEmpleado(null); // Asegura que el estado es null si no se encuentra
        }
      } catch (error) {
        console.error("Error fetching employee:", error);
        setEmpleado(null); // Asegura que el estado es null en caso de error
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

  // --- ¡Ajuste en el renderizado para usar personalData.mail! ---
  // Accede a las propiedades anidadas bajo 'personalData'.
  // Uso el fallback `empleado.nombre` por si acaso tienes algunos datos aplanados,
  // pero la intención es usar `empleado.personalData?.propiedad`.
  const displayNombre = empleado.personalData?.nombre || empleado.nombre;
  const displayApellido = empleado.personalData?.apellido || empleado.apellido;
  const displayDni = empleado.personalData?.dni || empleado.dni;
  const displayEmail = empleado.personalData?.mail || empleado.email; // <-- Usar 'mail' aquí
  const displayTelefono = empleado.personalData?.telefono || empleado.telefono;
  const displayFechaNacimiento =
    empleado.personalData?.fechaNacimiento || empleado.fechaNacimiento || "N/A";
  const displayGenero =
    empleado.personalData?.genero || empleado.genero || "N/A";
  const displayEstadoCivil =
    empleado.personalData?.estadoCivil || empleado.estadoCivil || "N/A";
  const displayDireccion =
    empleado.personalData?.direccion || empleado.direccion || "N/A";

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
                <strong>Nombre:</strong> {displayNombre}
              </p>
              <p>
                <strong>Apellido:</strong> {displayApellido}
              </p>
              <p>
                <strong>DNI:</strong> {displayDni}
              </p>
              <p>
                <strong>Fecha de Nacimiento:</strong> {displayFechaNacimiento}
              </p>
              <p>
                <strong>Género:</strong> {displayGenero}
              </p>
              <p>
                <strong>Estado Civil:</strong> {displayEstadoCivil}
              </p>
            </Col>
            <Col md={6}>
              <h5>Información de Contacto</h5>
              <p>
                <strong>Email:</strong> {displayEmail}
              </p>
              <p>
                <strong>Teléfono:</strong> {displayTelefono}
              </p>
              <p>
                <strong>Dirección:</strong> {displayDireccion}
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

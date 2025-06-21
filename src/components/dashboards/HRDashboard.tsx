// src/components/dashboard/HRDashboard.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Row,
  Col,
  Spinner,
  Alert,
  Tabs,
  Tab,
  Button, // Para el botón de recarga
} from "react-bootstrap";
import { db } from "@/firebase/clientApp"; // Firestore Client SDK instance
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  Timestamp,
    doc,
  
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";

// Importar interfaces de datos del dashboard
import {
  DashboardUser,
  EmployeeDataRecord,
  Invitation,
} from "@/types/dashboardTypes";

// Importar los nuevos subcomponentes
import UsersTable from "../UsersTable";
import EmployeeDataTable from "../EmployeeDataTable";
import InvitationsTable from "../InvitationsTable";
import InvitationForm from "../InvitationForm";

// Importar el tipo EmployeeSearchField desde EmployeeDataTable
// Asumo que EmployeeDataTable define y exporta este tipo
import { EmployeeSearchField } from "../EmployeeDataTable";

// --- NOTA IMPORTANTE DE SEGURIDAD ---
// Las operaciones de cambiar roles (en la colección 'users') y crear invitaciones
// (en la colección 'candidateInvitations') DEBEN ejecutarse en un entorno de backend seguro
// (Cloud Function, API Route en App Hosting, etc.) usando la Firebase Admin SDK.
// El código a continuación mostrará cómo el frontend *llamaría* a estas funciones de backend.
// DEBES IMPLEMENTAR ESTAS FUNCIONES DE BACKEND POR SEPARADO.
// --- FIN NOTA DE SEGURIDAD ---

// Roles disponibles para la aplicación
const AVAILABLE_ROLES = ["user", "RRHH-Admin", "admin"]; // Define tus roles aquí
const INVITE_ROLES = ["user"]; // Roles que se pueden asignar al invitar (ej: no permitir invitar admins directamente)

// --- Componente Principal HRDashboard ---
const HRDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("employee-data"); // Estado para controlar la pestaña activa

  // Estados para datos de employee-data
  const [employees, setEmployees] = useState<EmployeeDataRecord[]>([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  // ¡Cambio aquí! Usar EmployeeSearchField para el estado de campo de búsqueda
  const [employeeSearchField, setEmployeeSearchField] =
    useState<EmployeeSearchField>("personalData.dni");
  const [employeeDataLoading, setEmployeeDataLoading] = useState(true);
  const [employeeDataError, setEmployeeDataError] = useState<string | null>(
    null
  );

  // Estados para datos de users
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  // Estados para datos de candidateInvitations
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [invitationsError, setInvitationsError] = useState<string | null>(null);
  const [generatingInvitation, setGeneratingInvitation] = useState(false);

  // Estado para la inicialización de DB
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [dbInitError, setDbInitError] = useState<string | null>(null);

  // Asumo que tienes una forma de obtener el UID del usuario actual
  // Esto es crucial para `createdBy` en invitaciones.
  // Ejemplo: import { useAuth } from '@/context/AuthContext'; const { currentUser } = useAuth();
  const currentUserId = "admin_user_id"; // <-- ¡REEMPLAZA ESTO CON EL UID REAL DEL ADMIN AUTENTICADO!

  // --- Efecto para verificar inicialización de Firebase ---
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
          setDbInitError("Firebase no se inicializó en el tiempo esperado.");
        }
      }, 10000);

      return () => {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
      };
    }
  }, []);

  // --- Funciones para cargar datos ---

  // Cargar datos de 'employee-data'
  const fetchEmployeeData = useCallback(async () => {
    if (!isDbInitialized || !db) return;

    setEmployeeDataLoading(true);
    setEmployeeDataError(null);

    try {
      let q;
      // Aquí el campo de búsqueda debe ser la ruta anidada
      // Nota: Firestore REQUIERE un índice para consultas donde se combina 'where' y 'orderBy'
      // en campos diferentes, o para 'where' en campos anidados.
      // Si employeeSearchField es 'personalData.dni', 'personalData.nombre', etc., entonces
      // la consulta debe usar esos mismos nombres de campo.
      if (employeeSearchTerm) {
        q = query(
          collection(db, "employee-data"),
          where(employeeSearchField, ">=", employeeSearchTerm),
          where(employeeSearchField, "<=", employeeSearchTerm + "\uf8ff"),
          orderBy(employeeSearchField)
        );
      } else {
        // Ordena por el campo anidado 'personalData.apellido' por defecto
        q = query(
          collection(db, "employee-data"),
          orderBy("personalData.apellido")
        );
      }

      const querySnapshot = await getDocs(q);
      const data: EmployeeDataRecord[] = [];

      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        data.push({
          id: doc.id,
          // Mapea el objeto completo de PersonalData
          personalData: {
            nombre: docData.personalData?.nombre || "",
            apellido: docData.personalData?.apellido || "",
            dni: docData.personalData?.dni || "",
            cuil: docData.personalData?.cuil || "",
            fechaNacimiento: docData.personalData?.fechaNacimiento || "",
            direccion: docData.personalData?.direccion || "",
            telefono: docData.personalData?.telefono || "",
            telefonoAlternativo:
              docData.personalData?.telefonoAlternativo || "",
            mail: docData.personalData?.mail || "",
            genero: docData.personalData?.genero || "",
            estadoCivil: docData.personalData?.estadoCivil || "",
          },
          status: docData.status || "unknown", // Asegúrate que tu EmployeeData tiene un campo 'status'
          createdAt: docData.createdAt?.toDate() || null,
          // Añade otros campos raíz si los necesitas, ej: invitationId, submittedAt
          invitationId: docData.invitationId || undefined,
          submittedAt: docData.submittedAt?.toDate() || null,
        });
      });
      setEmployees(data);
    } catch (err) {
      console.error("Error cargando datos de empleados:", err);
      let errorMessage = "Error al cargar datos de empleados";
      if (err instanceof FirebaseError) {
        errorMessage += `: ${err.message}`;
      } else if (err instanceof Error) {
        errorMessage += `: ${err.message}`;
      }
      setEmployeeDataError(errorMessage);
    } finally {
      setEmployeeDataLoading(false);
    }
  }, [isDbInitialized, employeeSearchTerm, employeeSearchField]); // <-- Dependencias actualizadas

  // Cargar datos de 'users' (perfiles de autenticación extendidos)
  const fetchUsers = useCallback(async () => {
    if (!isDbInitialized || !db) return;

    setUsersLoading(true);
    setUsersError(null);

    try {
      const usersCollectionRef = collection(db, "users");
      const q = query(usersCollectionRef, orderBy("email"));
      const querySnapshot = await getDocs(q);
      const data: DashboardUser[] = [];

      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        data.push({
          id: doc.id,
          email: docData.email || "",
          role: docData.role || "user",
        });
      });
      setUsers(data);
    } catch (err) {
      console.error("Error cargando usuarios:", err);
      let errorMessage = "Error al cargar usuarios";
      if (err instanceof FirebaseError) {
        errorMessage += `: ${err.message}`;
      } else if (err instanceof Error) {
        errorMessage += `: ${err.message}`;
      }
      setUsersError(errorMessage);
    } finally {
      setUsersLoading(false);
    }
  }, [isDbInitialized]);

  // Cargar datos de 'candidateInvitations'
  const fetchInvitations = useCallback(async () => {
    if (!isDbInitialized || !db) return;

    setInvitationsLoading(true);
    setInvitationsError(null);

    try {
      const invitationsCollectionRef = collection(db, "candidateInvitations");
      const q = query(invitationsCollectionRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const data: Invitation[] = [];

      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        data.push({
          id: doc.id,
          email: docData.email || "",
          role: docData.role || "user",
          createdAt: docData.createdAt || Timestamp.now(),
          createdBy: docData.createdBy || "unknown",
          used: docData.used || false,
          usedAt: docData.usedAt || undefined,
          usedBy: docData.usedBy || undefined,
        });
      });
      setInvitations(data);
    } catch (err) {
      console.error("Error cargando invitaciones:", err);
      let errorMessage = "Error al cargar invitaciones";
      if (err instanceof FirebaseError) {
        errorMessage += `: ${err.message}`;
      } else if (err instanceof Error) {
        errorMessage += `: ${err.message}`;
      }
      setInvitationsError(errorMessage);
    } finally {
      setInvitationsLoading(false);
    }
  }, [isDbInitialized]);

  // --- Efecto para cargar datos al inicializar la DB o cambiar de pestaña ---
  useEffect(() => {
    if (isDbInitialized) {
      if (activeTab === "employee-data") {
        fetchEmployeeData();
      } else if (activeTab === "users") {
        fetchUsers();
      } else if (activeTab === "invitations") {
        fetchInvitations();
      }
    }
  }, [
    isDbInitialized,
    activeTab,
    fetchEmployeeData,
    fetchUsers,
    fetchInvitations,
  ]);

  // --- Handlers para acciones ---

  // Manejar el cambio de rol (llama a un backend seguro)
  const handleChangeUserRole = useCallback(
    async (userId: string, newRole: string) => {
      // Placeholder: LLAMADA REAL A LA FUNCIÓN DE BACKEND
      // Este es un ejemplo para una Cloud Function invocable por HTTPS:
      // import { getFunctions, httpsCallable } from "firebase/functions";
      // const functions = getFunctions();
      // const changeUserRoleCallable = httpsCallable(functions, 'changeUserRole');
      // await changeUserRoleCallable({ userId, newRole });

      // Placeholder: Simular llamada a backend para cambiar rol
      console.log(
        `[BACKEND CALL] Cambiando rol de usuario ${userId} a ${newRole}`
      );
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simula latencia
      console.log(`[BACKEND CALL] Rol cambiado exitosamente para ${userId}.`);

      // Después del éxito del backend, actualiza el estado local o recarga los datos
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );
      // O para ser más seguro, puedes volver a llamar a fetchUsers();
    },
    []
  );

  // Manejar la generación de invitación (llama a un backend seguro)
  const handleGenerateInvitation = useCallback(
    async (email: string, role: string) => {
      if (!currentUserId) {
        // Asegúrate de que el admin está logueado
        throw new Error(
          "Usuario administrador no autenticado para generar invitación."
        );
      }

      setGeneratingInvitation(true);
      try {
        // Placeholder: LLAMADA REAL A LA FUNCIÓN DE BACKEND
        // Este es un ejemplo para una Cloud Function invocable por HTTPS:
        // import { getFunctions, httpsCallable } from "firebase/functions";
        // const functions = getFunctions();
        // const generateInvitationCallable = httpsCallable(functions, 'generateInvitation');
        // await generateInvitationCallable({ email, role, createdBy: currentUserId });

        // Placeholder: Simular llamada a backend para generar invitación
        console.log(
          `[BACKEND CALL] Generando invitación para ${email} con rol ${role} por ${currentUserId}`
        );
        const newInvitationDocRef = doc(collection(db, "candidateInvitations")); // Genera un ID de documento local
        await new Promise((resolve) => setTimeout(resolve, 1500)); // Simula latencia

        // Actualiza el estado local con la nueva invitación
        const newInvitation: Invitation = {
          id: newInvitationDocRef.id,
          email,
          role,
          createdAt: Timestamp.now(),
          createdBy: currentUserId,
          used: false,
        };
        setInvitations((prevInvitations) => [
          newInvitation,
          ...prevInvitations,
        ]); // Añadir al inicio

        console.log(
          `[BACKEND CALL] Invitación generada exitosamente para ${email}.`
        );
      } catch (err) {
        console.error("Error generando invitación:", err);
        throw err; // Relanzar para que el componente InvitationForm lo maneje
      } finally {
        setGeneratingInvitation(false);
      }
    },
    [currentUserId]
  ); // Depende del UID del admin actual

  // Manejar descarga de datos de empleados
  const handleEmployeeDataDownload = useCallback(() => {
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
        "Estado",
      ];

      // Datos
      const rows = employees.map((employee, index) => {
        // Ahora employee es de tipo EmployeeDataRecord, que tiene personalData
        const pData = employee.personalData; // Accede directamente a personalData

        return [
          (index + 1).toString(),
          `"${pData.nombre}"`,
          `"${pData.apellido}"`,
          `"${pData.dni}"`,
          `"${pData.mail}"`,
          `"${pData.telefono}"`,
          `"${pData.fechaNacimiento || "N/A"}"`,
          `"${pData.genero || "N/A"}"`,
          `"${pData.estadoCivil || "N/A"}"`,
          `"${employee.createdAt?.toLocaleDateString() || "N/A"}"`,
          `"${employee.status}"`,
        ];
      });

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
      alert("Error al generar el archivo de descarga.");
    }
  }, [employees]); // Depende de los empleados cargados

  // Manejador para el campo de búsqueda de empleados
  const handleEmployeeSearchChange = useCallback(
    (term: string, field: EmployeeSearchField) => {
      setEmployeeSearchTerm(term);
      setEmployeeSearchField(field);
    },
    []
  );

  // --- Renderizado Condicional ---
  if (dbInitError) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">
          <strong>Error de inicialización:</strong> {dbInitError}
          <div className="mt-3">
            <Button variant="primary" onClick={() => window.location.reload()}>
              Recargar página
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

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
      <Row className="mb-4">
        <Col>
          <h2>Dashboard de RRHH</h2>
        </Col>
      </Row>

      <Tabs
        id="hr-dashboard-tabs"
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k as string)}
        className="mb-3"
      >
        {/* Pestaña de Datos de Empleados */}
        <Tab eventKey="employee-data" title="Datos de Empleados">
          <EmployeeDataTable
            employees={employees}
            loading={employeeDataLoading}
            error={employeeDataError}
            onSearchChange={handleEmployeeSearchChange}
            onDownload={handleEmployeeDataDownload}
            searchTerm={employeeSearchTerm}
            searchField={employeeSearchField}
            hasData={employees.length > 0}
          />
        </Tab>

        {/* Pestaña de Gestión de Usuarios y Roles */}
        <Tab eventKey="users" title="Gestión de Usuarios">
          <UsersTable
            users={users}
            loading={usersLoading}
            error={usersError}
            onChangeRole={handleChangeUserRole}
            availableRoles={AVAILABLE_ROLES}
          />
        </Tab>

        {/* Pestaña de Invitaciones */}
        <Tab eventKey="invitations" title="Invitaciones">
          <InvitationsTable
            invitations={invitations}
            loading={invitationsLoading}
            error={invitationsError}
          />
          <InvitationForm
            onGenerateInvitation={handleGenerateInvitation}
            generating={generatingInvitation}
            availableRoles={INVITE_ROLES}
          />
        </Tab>
      </Tabs>
    </Container>
  );
};

export default HRDashboard;

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
  Button,
} from "react-bootstrap";
import { db } from "@/firebase/clientApp"; // Firestore Client SDK instance
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  Timestamp,
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";

import { getFunctions, httpsCallable } from "firebase/functions";

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
import InvitationForm from "../InvitationForm"; // Asegúrate de que InvitationForm se actualice para DNI y Clave.

import { EmployeeSearchField } from "../EmployeeDataTable";

// --- NOTA IMPORTANTE DE SEGURIDAD (REAFIRMADA) ---
// Las operaciones de cambiar roles y crear invitaciones DEBEN ejecutarse en un entorno de backend seguro
// (Cloud Function, API Route en App Hosting, etc.) usando la Firebase Admin SDK.
// El código a continuación mostrará cómo el frontend LLAMARÁ a estas funciones de backend.
// DEBES IMPLEMENTAR ESTAS FUNCIONES DE BACKEND POR SEPARADO (en tu carpeta `functions` para Cloud Functions).
// --- FIN NOTA DE SEGURIDAD ---

// Define todos los roles que tu aplicación maneja
const ALL_APP_ROLES = ["colaborador", "datos", "rrhh", "admin", "user"];
// Roles que se pueden asignar al invitar
const INVITE_ROLES = ["colaborador", "datos", "rrhh"]; // Puedes añadir "user" si lo consideras apropiado aquí.

// --- Componente Principal HRDashboard ---
const HRDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("employee-data");

  // Estados para datos de employee-data
  const [employees, setEmployees] = useState<EmployeeDataRecord[]>([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
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

  // Estado para la inicialización de DB y Functions
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [dbInitError, setDbInitError] = useState<string | null>(null);

  // Asumo que tienes una forma de obtener el UID del usuario actual
  // Esto es crucial para `createdBy` en invitaciones.
  // Ejemplo: import { useAuth } from '@/context/AuthContext'; const { currentUser } = useAuth();
  // *** IMPORTANTE: REEMPLAZA ESTO CON EL UID REAL DEL ADMIN AUTENTICADO ***
  const currentUserId = "admin_user_id"; // <-- ¡ESTO DEBE SER EL UID REAL DEL USUARIO!

  // --- Efecto para verificar inicialización de Firebase ---
  useEffect(() => {
    if (db) {
      setIsDbInitialized(true);
    } else {
      // Tu lógica de reintento para la DB
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
      if (employeeSearchTerm) {
        q = query(
          collection(db, "employee-data"),
          where(employeeSearchField, ">=", employeeSearchTerm),
          where(employeeSearchField, "<=", employeeSearchTerm + "\uf8ff"),
          orderBy(employeeSearchField)
        );
      } else {
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
          status: docData.status || "unknown",
          createdAt: docData.createdAt?.toDate() || null,
          invitationId: docData.invitationId || undefined,
          submittedAt: docData.submittedAt?.toDate() || null,
        });
      });
      setEmployees(data);
    } catch (err: unknown) {
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
  }, [isDbInitialized, employeeSearchTerm, employeeSearchField]);

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
    } catch (err: unknown) {
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
          email: docData.email || undefined, // Email ahora es opcional/indefinido en la creación
          dni: docData.dni || "", // Mapear el campo DNI (ahora obligatorio en la creación)
          key: docData.key || "", // Mapear el campo Clave (ahora obligatorio en la creación)
          role: docData.role || "user",
          createdAt: docData.createdAt || Timestamp.now(),
          createdBy: docData.createdBy || "unknown",
          used: docData.used || false,
          usedAt: docData.usedAt || undefined,
          usedBy: docData.usedBy || undefined,
        });
      });
      setInvitations(data);
    } catch (err: unknown) {
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
      const functions = getFunctions();
      const changeUserRoleCallable = httpsCallable(functions, "changeUserRole");

      try {
        setUsersLoading(true);
        await changeUserRoleCallable({ userId, newRole });
        console.log(
          `Rol de usuario ${userId} cambiado exitosamente a ${newRole}.`
        );

        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.id === userId ? { ...user, role: newRole } : user
          )
        );
      } catch (err: unknown) {
        console.error("Error cambiando rol de usuario:", err);
        let errorMessage = "Error al cambiar el rol.";
        if (err instanceof FirebaseError) {
          errorMessage += `: ${err.message}`;
        } else if (err instanceof Error) {
          errorMessage += `: ${err.message}`;
        }
        alert(errorMessage);
      } finally {
        setUsersLoading(false);
      }
    },
    []
  );

  // *** CAMBIO CLAVE: Manejar la generación de invitación (ahora con DNI, Clave y Rol) ***
  const handleGenerateInvitation = useCallback(
    async (dni: string, key: string, role: string) => {
      // Nuevos argumentos
      if (!currentUserId || currentUserId === "admin_user_id") {
        throw new Error(
          "Usuario administrador no autenticado o ID de usuario de prueba. No se puede generar invitación."
        );
      }

      setGeneratingInvitation(true);
      const functions = getFunctions();
      const generateInvitationCallable = httpsCallable(
        functions,
        "generateInvitation"
      );

      try {
        // Llamada a la Cloud Function para generar y persistir la invitación
        // Se pasan DNI, Clave y Rol
        const result = await generateInvitationCallable({
          dni,
          key,
          role,
          createdBy: currentUserId,
        });
        const newInvitationData = result.data as Invitation;

        // Actualiza el estado local con la nueva invitación devuelta por la CF
        setInvitations((prevInvitations) => [
          {
            ...newInvitationData,
            createdAt: newInvitationData.createdAt || Timestamp.now(),
          },
          ...prevInvitations,
        ]);

        console.log(
          `Invitación para DNI: ${dni} generada y guardada exitosamente.`
        );
        return `Invitación para DNI: ${dni} generada exitosamente!`; // Devolver mensaje de éxito para el InvitationForm
      } catch (err: unknown) {
        console.error("Error generando invitación:", err);
        let errorMessage = "Error al generar la invitación.";
        if (err instanceof FirebaseError) {
          errorMessage += `: ${err.message}`;
        } else if (err instanceof Error) {
          errorMessage += `: ${err.message}`;
        }
        throw new Error(errorMessage);
      } finally {
        setGeneratingInvitation(false);
      }
    },
    [currentUserId]
  );

  // Manejar descarga de datos de empleados
  const handleEmployeeDataDownload = useCallback(() => {
    try {
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

      const rows = employees.map((employee, index) => {
        const pData = employee.personalData;

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

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute("download", "empleados.csv");
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: unknown) {
      console.error("Error generando CSV:", error);
      alert("Error al generar el archivo de descarga.");
    }
  }, [employees]);

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
            availableRoles={ALL_APP_ROLES} // Usar ALL_APP_ROLES aquí si UserTable permite asignar todos los roles
          />
        </Tab>

        {/* Pestaña de Invitaciones */}
        <Tab eventKey="invitations" title="Invitaciones">
          <InvitationsTable
            invitations={invitations}
            loading={invitationsLoading}
            error={invitationsError}
          />
          {/* *** MODIFICACIÓN CLAVE: Pasar INVITE_ROLES al InvitationForm *** */}
          <InvitationForm
            onGenerateInvitation={handleGenerateInvitation}
            generating={generatingInvitation}
            availableRoles={INVITE_ROLES} // <-- Usar INVITE_ROLES para los roles que se pueden invitar
          />
        </Tab>
      </Tabs>
    </Container>
  );
};

export default HRDashboard;

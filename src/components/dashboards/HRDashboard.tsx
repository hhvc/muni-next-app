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

// *** CAMBIO CLAVE: Importar tu hook useAuth ***
import { useAuth } from "@/hooks/useAuth"; // Asegúrate de que esta ruta sea correcta

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

import { EmployeeSearchField } from "../EmployeeDataTable";

// --- NOTA IMPORTANTE DE SEGURIDAD (REAFIRMADA) ---
// Las operaciones de cambiar roles y crear invitaciones DEBEN ejecutarse en un entorno de backend seguro
// (Cloud Function, API Route en App Hosting, etc.) usando la Firebase Admin SDK.
// El código a continuación mostrará cómo el frontend LLAMARÁ a estas funciones de backend.
// DEBES IMPLEMENTAR ESTAS FUNCIONES DE BACKEND POR SEPARADO (en tu carpeta `functions` para Cloud Functions).
// --- FIN NOTA DE SEGURIDAD ---

// Define todos los roles que tu aplicación maneja
const ALL_APP_ROLES = [
  "root",
  "rrhh",
  "colaborador",
  "datos",
  "admin principal",
  "rrhh admin",
];
// Roles que se pueden asignar al invitar
const INVITE_ROLES = ["rrhh", "colaborador", "datos"];

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

  // Estado para la inicialización de DB
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [dbInitError, setDbInitError] = useState<string | null>(null);

  // *** CAMBIO CLAVE: Consumir el hook useAuth ***
  const { user, userRole, loading: authLoading } = useAuth(); // 'user' es el objeto User, 'userRole' el rol de Firestore
  const currentUserId = user?.uid || null; // Obtenemos el UID si el usuario existe, si no, null

  // --- Efecto para verificar inicialización de Firebase DB (la autenticación la maneja useAuth) ---
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
  }, []); // Solo depende de la inicialización de DB

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
          email: docData.email || undefined,
          dni: docData.dni || "",
          key: docData.key || "",
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
    if (isDbInitialized && !authLoading && user) {
      // Solo cargar si DB y Auth están inicializados Y hay un usuario
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
    authLoading, // Añadir a las dependencias
    user, // Añadir a las dependencias
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

  // Manejar la generación de invitación (ahora con DNI, Clave y Rol)
  const handleGenerateInvitation = useCallback(
    async (dni: string, key: string, role: string) => {
      // *** CAMBIO CLAVE AQUÍ: Usar currentUserId real del hook ***
      if (!currentUserId) {
        // user.uid será null si no hay user
        throw new Error("Usuario no autenticado. Por favor, inicie sesión.");
      }

      setGeneratingInvitation(true);
      const functions = getFunctions();
      const generateInvitationCallable = httpsCallable(
        functions,
        "generateInvitation"
      );

      try {
        const result = await generateInvitationCallable({
          dni,
          key,
          role,
          createdBy: currentUserId,
        });
        const newInvitationData = result.data as Invitation;

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
        return `Invitación para DNI: ${dni} generada exitosamente!`;
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
  // Muestra errores de inicialización de la base de datos
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

  // Muestra un spinner mientras se inicializan la DB o la autenticación
  if (!isDbInitialized || authLoading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">
          {authLoading
            ? "Verificando autenticación..."
            : "Inicializando base de datos..."}
        </p>
      </Container>
    );
  }

  // Si no hay un usuario autenticado (user es null después de authLoading)
  if (!user) {
    // 'user' viene del hook useAuth
    return (
      <Container className="mt-5">
        <Alert variant="warning">
          Debe iniciar sesión para acceder al Dashboard de RRHH.
          {/* Aquí podrías añadir un botón o enlace a tu página de login */}
          <div className="mt-3">
            <Button
              variant="primary" /* onClick={() => router.push('/login')} */
            >
              Ir a Iniciar Sesión
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  // *** CAMBIO CLAVE: Verificación de rol para acceder al Dashboard ***
  // Si el usuario está logeado, pero su rol no es uno de los autorizados para este dashboard
  const authorizedDashboardRoles = ["root", "admin principal", "rrhh admin"]; // Roles con acceso total al dashboard

  if (!userRole || !authorizedDashboardRoles.includes(userRole)) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">
          Acceso denegado. No tienes los permisos necesarios para ver este
          dashboard.
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-5">
      <Row className="mb-4">
        <Col>
          <h2>Dashboard de RRHH</h2>
          {user &&
            userRole && ( // Mostrar el rol del usuario actual
              <p className="text-muted">
                Conectado como: {user.email} (Rol: {userRole})
              </p>
            )}
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
            availableRoles={ALL_APP_ROLES} // Usar ALL_APP_ROLES aquí si UsersTable permite asignar todos los roles
          />
        </Tab>

        {/* Pestaña de Invitaciones */}
        <Tab eventKey="invitations" title="Invitaciones">
          <InvitationsTable
            invitations={invitations}
            loading={invitationsLoading}
            error={invitationsError}
          />
          {/* Pasar INVITE_ROLES al InvitationForm para los roles que se pueden invitar */}
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

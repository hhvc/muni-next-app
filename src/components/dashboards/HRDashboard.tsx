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
  Timestamp, // Importar Timestamp desde firebase/firestore
} from "firebase/firestore";
import { FirebaseError } from "firebase/app"; // Importar FirebaseError desde firebase/app

import { getFunctions, httpsCallable } from "firebase/functions";

// *** CAMBIO CLAVE: Importar el hook useAuth desde tu AuthProvider ***
import { useAuth } from "@/components/AuthProvider"; // Asegúrate de que esta ruta sea correcta

// Importar interfaces de datos del dashboard
import {
  DashboardUser,
  EmployeeDataRecord,
  Invitation, // Asegúrate de que 'Invitation' de dashboardTypes sea compatible con GeneratedInvitationResponse
} from "@/types/dashboardTypes";

// Importar los nuevos subcomponentes
import UsersTable from "../UsersTable";
import EmployeeDataTable from "../EmployeeDataTable";
import InvitationsTable from "../InvitationsTable";
import InvitationForm from "../InvitationForm"; // El InvitationForm actualizado ya espera el tipo correcto

import { EmployeeSearchField } from "../EmployeeDataTable";

// --- NOTA IMPORTANTE DE SEGURIDAD (REAFIRMADA) ---
// ... (mantiene la nota de seguridad) ...

// Define todos los roles que tu aplicación maneja
const ALL_APP_ROLES = [
  "root",
  "rrhh",
  "colaborador",
  "admin principal",
  "rrhh admin",
  "candidate"
];
// Roles que se pueden asignar al invitar
const INVITE_ROLES = ["rrhh", "datos", "candidate"]; // Ajusta según sea necesario

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

  // *** CAMBIO CLAVE: Consumir el contexto de AuthProvider ***
  const {
    user,
    userRole,
    loadingUserStatus, // <-- Nuevo nombre del estado de carga global
    hasError, // <-- Para errores del AuthProvider
    errorDetails, // <-- Detalles del error del AuthProvider
  } = useAuth();

  // --- Efecto para verificar inicialización de Firebase DB ---
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

  // --- Funciones para cargar datos (fetchEmployeeData, fetchUsers, fetchInvitations) ---

  const fetchEmployeeData = useCallback(async () => {
    if (!isDbInitialized || !db) return;
    setEmployeeDataLoading(true);
    setEmployeeDataError(null);
    try {
      let q;
      const employeeDataCollectionRef = collection(db, "employee-data"); // Usa la instancia 'db' correctamente
      if (employeeSearchTerm) {
        q = query(
          employeeDataCollectionRef,
          where(employeeSearchField, ">=", employeeSearchTerm),
          where(employeeSearchField, "<=", employeeSearchTerm + "\uf8ff"),
          orderBy(employeeSearchField)
        );
      } else {
        q = query(employeeDataCollectionRef, orderBy("personalData.apellido"));
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
          // Firestore Timestamp objects have .toDate() method.
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

  const fetchInvitations = useCallback(async () => {
    if (!isDbInitialized || !db) return;
    setInvitationsLoading(true);
    setInvitationsError(null);
    try {
      // Asumiendo que 'candidateInvitations' está en la DB por defecto
      const invitationsCollectionRef = collection(db, "candidateInvitations");
      const q = query(invitationsCollectionRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const data: Invitation[] = [];
      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        data.push({
          id: doc.id,
          // 🎯 OJO: Si tu Cloud Function 'generateInvitation' devuelve 'email'
          // y lo almacena, asegúrate de que también esté en tu base de datos y en GeneratedInvitationResponse.
          email: docData.email || undefined,
          dni: docData.dni || "",
          code: docData.code || "",
          role: docData.role || "user",
          // createdAt debe ser de tipo Timestamp, aquí usamos .toMillis() o .toDate() si se requiere fecha
          createdAt:
            docData.createdAt instanceof Timestamp
              ? docData.createdAt
              : Timestamp.now(), // Asegurarse de que es un Timestamp
          createdBy: docData.createdBy || "unknown",
          used: docData.used || false,
          usedAt:
            docData.usedAt instanceof Timestamp ? docData.usedAt : undefined,
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
    // *** CAMBIO CLAVE: Esperar a que 'loadingUserStatus' sea false y a que haya un usuario ***
    // La carga de datos específicos (empleados, usuarios, invitaciones) solo
    // se inicia cuando la DB está inicializada, el AuthProvider ha terminado de cargar
    // el estado del usuario y su rol, y hay un usuario autenticado.
    if (isDbInitialized && !loadingUserStatus && user) {
      console.log(
        "HRDashboard: Efecto de carga de datos disparado (Auth/DB listos)."
      );
      if (activeTab === "employee-data") {
        fetchEmployeeData();
      } else if (activeTab === "users") {
        fetchUsers();
      } else if (activeTab === "invitations") {
        fetchInvitations();
      }
    } else if (!isDbInitialized) {
      console.log("HRDashboard: Esperando inicialización de DB.");
    } else if (loadingUserStatus) {
      console.log(
        "HRDashboard: Esperando autenticación y carga de rol del AuthProvider."
      );
    } else if (!user) {
      console.log("HRDashboard: No hay usuario autenticado para cargar datos.");
    }
  }, [
    isDbInitialized,
    loadingUserStatus, // <-- Nueva dependencia
    user, // <-- Nueva dependencia
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

  const handleGenerateInvitation = useCallback(
    // 🎯 CAMBIO CLAVE 1: El tipo de retorno de la función es Promise<Invitation>
    async (dni: string, code: string, role: string): Promise<Invitation> => {
      // *** CAMBIO CLAVE: user.uid ahora proviene del contexto de AuthProvider ***
      if (!user || !user.uid) {
        // Verificar si user es null o si user.uid es null/undefined
        throw new Error("Usuario no autenticado. Por favor, inicie sesión.");
      }

      setGeneratingInvitation(true);
      // 🎯 CAMBIO CLAVE 2: Quitamos la anotación de tipo explícita. TypeScript lo infiere.
      const functionsInstance = getFunctions();

      // 🎯 CAMBIO CLAVE 3: Tipamos httpsCallable con 'Invitation' como tipo de respuesta
      // El primer argumento genérico es para el payload de entrada, el segundo para la respuesta.
      const generateInvitationCallable = httpsCallable<
        { dni: string; code: string; role: string; createdBy: string }, // Tipo del payload de entrada
        Invitation // <-- ¡Esperamos este tipo de respuesta de la Cloud Function!
      >(functionsInstance, "generateInvitation");

      try {
        // Se pasan DNI, Clave y Rol
        const result = await generateInvitationCallable({
          dni,
          code,
          role,
          createdBy: user.uid,
        });

        // 🎯 CAMBIO CLAVE 4: El 'result.data' ya viene tipado como 'Invitation'
        // gracias al tipo genérico que le pasamos a httpsCallable.
        const newInvitationData: Invitation = result.data;

        // Actualizamos el estado de las invitaciones.
        // newInvitationData.createdAt ya es un Timestamp gracias a la Cloud Function actualizada.
        setInvitations((prevInvitations) => [
          {
            ...newInvitationData,
            // La línea 'createdAt: newInvitationData.createdAt || Timestamp.now(),'
            // es un buen fallback, pero si la Cloud Function garantiza el Timestamp,
            // podría ser solo 'createdAt: newInvitationData.createdAt,'
          },
          ...prevInvitations,
        ]);

        console.log(
          `Invitación para DNI: ${dni} generada y guardada exitosamente.`
        );

        // 🎯 CAMBIO CLAVE 5: Devolvemos el objeto completo 'newInvitationData'
        // que coincide con el tipo de retorno de la promesa de handleGenerateInvitation.
        return newInvitationData;
      } catch (err: unknown) {
        console.error("Error generando invitación:", err);
        let errorMessage = "Error al generar la invitación.";
        if (err instanceof FirebaseError) {
          errorMessage += `: ${err.message}`;
        } else if (err instanceof Error) {
          errorMessage += `: ${err.message}`;
        }
        // Aseguramos que el error lanzado también sea del tipo esperado por el llamador
        throw new Error(errorMessage);
      } finally {
        setGeneratingInvitation(false);
      }
    },
    [user, setInvitations, setGeneratingInvitation] // <-- Dependencias de 'user' y de los setters de estado
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
          // createdAt ya es un objeto Date aquí, así que .toLocaleDateString() funciona bien
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
  }, [employees]); // Depende de 'employees' para asegurar que el CSV se genera con los datos actuales

  // Manejador para el campo de búsqueda de empleados
  const handleEmployeeSearchChange = useCallback(
    (term: string, field: EmployeeSearchField) => {
      setEmployeeSearchTerm(term);
      setEmployeeSearchField(field);
    },
    [] // No tiene dependencias externas, ya que solo actualiza estados
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

  // Si hay un error del AuthProvider, mostrarlo.
  if (hasError) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">
          <strong>Error de autenticación:</strong> {errorDetails}
          <div className="mt-3">
            <Button variant="primary" onClick={() => window.location.reload()}>
              Recargar página
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  // Muestra un spinner mientras se inicializan la DB o el AuthProvider está cargando
  if (!isDbInitialized || loadingUserStatus) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">
          {loadingUserStatus
            ? "Verificando autenticación y rol..."
            : "Inicializando base de datos..."}
        </p>
      </Container>
    );
  }

  // Si no hay un usuario autenticado (user es null después de que AuthProvider terminó de cargar)
  if (!user) {
    return (
      <Container className="mt-5">
        <Alert variant="warning">
          Debe iniciar sesión para acceder al Dashboard de RRHH.
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

  // Verificación de rol para acceder al Dashboard
  const authorizedDashboardRoles = ["root", "admin principal", "rrhh admin"];

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
          {user && userRole && (
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
            availableRoles={ALL_APP_ROLES}
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
            // Aquí la prop 'onGenerateInvitation' está tipada correctamente
            // para esperar una función que devuelve Promise<Invitation>
            onGenerateInvitation={handleGenerateInvitation}
            generating={generatingInvitation}
            availableRoles={INVITE_ROLES}
          />
        </Tab>
      </Tabs>
    </Container>
  );
}; // Cierra el componente HRDashboard

export default HRDashboard;

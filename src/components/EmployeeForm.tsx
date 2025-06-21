// src/components/EmployeeForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Card,
  Spinner,
  Alert,
} from "react-bootstrap";
import { db, storage } from "@/firebase/clientApp"; // Assuming db and storage are initialized correctly and potentially null
import { useRouter } from "next/navigation";
import {
  loadEmployeeData,
  saveEmployeeRecord,
} from "@/services/employeeFormService";
import {
  EmployeeData,
  PersonalData,
  EmployeeFormProps,
  DocumentUrlKey,
  FileType, // Ensure FileType is imported
} from "@/types/employeeFormTypes";

// Asumo que FileType y DocumentUrlKey son tipos de string que representan las mismas claves.
// Si no son exactamente el mismo tipo, puede que necesites casteos adicionales o refinar los tipos.
// Basado en tu uso, parecen ser intercambiables en la práctica (e.g., 'dniFile', 'carnetConducirFile').
// Para mantener la claridad con tu código, sigo usando FileType para el estado de archivos y DocumentUrlKey para las URLs.

// Componentes auxiliares
const LoadingSpinner = () => (
  <Container className="text-center my-5">
    <Spinner animation="border" variant="primary" />
    <p className="mt-3">Cargando formulario...</p>
  </Container>
);

const SavingSpinner = () => (
  <>
    <Spinner size="sm" className="me-2" />
    Guardando...
  </>
);

const DraftBadge = () => (
  <span className="badge bg-warning text-dark ms-2">Borrador Guardado</span>
);

interface CompletedFormViewProps {
  router: ReturnType<typeof useRouter>;
}

const CompletedFormView = ({ router }: CompletedFormViewProps) => (
  <Container className="mt-5">
    <Row className="justify-content-md-center">
      <Col md={8}>
        <Card className="text-center border-success">
          <Card.Header className="bg-success text-white">
            <Card.Title>Formulario Completado</Card.Title>
          </Card.Header>
          <Card.Body>
            <Card.Text>
              Ya has completado este formulario. No se permiten más
              modificaciones.
            </Card.Text>
            <Button variant="primary" onClick={() => router.push("/")}>
              Volver al inicio
            </Button>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  </Container>
);

interface FormFieldProps {
  name: keyof PersonalData;
  value: string;
  label: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  readOnly?: boolean;
}

const FormField = ({
  name,
  value,
  label,
  onChange,
  type = "text",
  required,
  readOnly,
}: FormFieldProps) => (
  <Col md={getColSize(name)}>
    <Form.Group controlId={`form${name}`}>
      <Form.Label>{label}</Form.Label>
      <Form.Control
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        readOnly={readOnly}
      />
    </Form.Group>
  </Col>
);

interface DocumentInfoProps {
  fileType: FileType; // Usar FileType para consistencia con attachedFiles
  existingData: EmployeeData | null;
}

const DocumentInfo = ({ fileType, existingData }: DocumentInfoProps) => {
  // Lista de documentos que son requeridos para el envío definitivo
  // Asegúrate de que esta lista coincida con los documentos en el estado `attachedFiles`
  const requiredDocumentTypes: FileType[] = [
    "dniFile",
    "carnetConducirFile",
    "analiticoSecundarioFile",
    "aptoFisicoFile",
    "buenaConductaFile",
    "examenToxicologicoFile",
    "deudoresAlimentariosFile",
    "delitosIntegridadSexualFile",
    "curriculumVitaeFile",
  ];
  const isRequiredForCompletion = requiredDocumentTypes.includes(fileType);

  return (
    <>
      <Form.Text className="text-muted">
        {existingData?.documentUrls?.[fileType as DocumentUrlKey] // Casteo necesario si FileType y DocumentUrlKey son diferentes
          ? "Documento ya subido. Seleccione solo para actualizar"
          : isRequiredForCompletion
          ? "Requerido para envío definitivo"
          : "Opcional"}
      </Form.Text>
      {existingData?.documentUrls?.[fileType as DocumentUrlKey] && ( // Casteo necesario
        <div className="mt-1">
          <a
            href={existingData.documentUrls[fileType as DocumentUrlKey]!}
            target="_blank"
            rel="noopener noreferrer"
            className="text-success"
          >
            Ver documento subido
          </a>
        </div>
      )}
    </>
  );
};

// Implementación principal del componente
const EmployeeForm: React.FC<EmployeeFormProps> = ({
  invitationId,
  userId,
}) => {
  const router = useRouter();

  // Estado inicial
  const [personalData, setPersonalData] = useState<PersonalData>({
    nombre: "",
    apellido: "",
    dni: "",
    cuil: "",
    fechaNacimiento: "",
    direccion: "",
    telefono: "",
    telefonoAlternativo: "",
    mail: "",
  });

  const [attachedFiles, setAttachedFiles] = useState<
    Record<FileType, File | null> // Usar FileType consistentemente
  >({
    dniFile: null,
    carnetConducirFile: null,
    analiticoSecundarioFile: null,
    aptoFisicoFile: null,
    buenaConductaFile: null,
    examenToxicologicoFile: null,
    deudoresAlimentariosFile: null,
    delitosIntegridadSexualFile: null,
    curriculumVitaeFile: null,
  });

  const [existingData, setExistingData] = useState<EmployeeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [topMessage, setTopMessage] = useState<{
    type: "success" | "danger" | "info" | "warning";
    text: string;
  } | null>(null);
  const [bottomMessage, setBottomMessage] = useState<string | null>(null);

  // Cargar datos existentes
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await loadEmployeeData(db, userId);
        if (data) {
          setExistingData(data);
          setPersonalData(data.personalData);
          // No cargamos los archivos adjuntos del borrador anterior aquí.
          // El usuario tendrá que volver a seleccionarlos si quiere subir una versión nueva.
          // Las URLs existentes se mostrarán en DocumentInfo.
          setTopMessage({
            type: "info",
            text:
              data.status === "completed"
                ? "Ya has completado este formulario. No puedes realizar cambios."
                : "Se cargó un borrador existente. Puedes continuar editando.",
          });
        }
      } catch (error) {
        // Captura el error para mostrarlo
        console.error("Error loading existing employee data:", error);
        setTopMessage({
          type: "warning",
          text: `No se pudieron cargar datos existentes, pero puedes continuar. Detalles: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId]); // Dependencia userId

  // Manejadores
  const handlePersonalDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPersonalData((prev) => ({
      ...prev,
      [name as keyof PersonalData]: value,
    }));
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: FileType // Usar FileType
  ) => {
    setAttachedFiles((prev) => ({
      ...prev,
      [fileType]: e.target.files?.[0] || null,
    }));
  };

  // --- Función de validación para envío definitivo ---
  const validateFormForCompletion = (): boolean => {
    setTopMessage(null); // Limpiar mensajes previos
    setBottomMessage(null);

    // 1. Validar Datos Personales requeridos
    const requiredPersonalDataKeys: (keyof PersonalData)[] = [
      "nombre",
      "apellido",
      "dni",
      "cuil",
      "fechaNacimiento",
      "direccion",
      "telefono",
      "mail",
    ];
    const missingPersonalData = requiredPersonalDataKeys.some(
      (key) => !personalData[key] || personalData[key].toString().trim() === "" // Convertir a string para trim
    );

    if (missingPersonalData) {
      setTopMessage({
        type: "danger",
        text: "Por favor, completa todos los campos de Datos Personales requeridos.",
      });
      return false;
    }

    // 2. Validar Documentos requeridos
    // Esta lista DEBE coincidir con la usada en DocumentInfo y en el estado attachedFiles
    const requiredDocumentTypes: FileType[] = [
      "dniFile",
      "carnetConducirFile",
      "analiticoSecundarioFile",
      "aptoFisicoFile",
      "buenaConductaFile",
      "examenToxicologicoFile",
      "deudoresAlimentariosFile",
      "delitosIntegridadSexualFile",
      "curriculumVitaeFile",
    ];

    const missingRequiredFiles = requiredDocumentTypes.some((fileType) => {
      // Check if there's an existing URL OR a new file attached for this type
      const hasExistingUrl =
        existingData?.documentUrls?.[fileType as DocumentUrlKey]; // Casteo necesario
      const isNewFileAttached = attachedFiles[fileType] !== null;
      return !hasExistingUrl && !isNewFileAttached; // Return true if it's required AND neither existing nor new file is present
    });

    if (missingRequiredFiles) {
      setTopMessage({
        type: "danger",
        text: "Debes adjuntar todos los documentos requeridos antes de enviar definitivamente o asegurarte de que ya están subidos.",
      });
      return false;
    }

    // Si llegamos aquí, la validación pasó
    return true;
  };
  // --- Fin de la función de validación ---

  // --- Handler para guardar (borrador o completo) ---
  const handleSave = async (status: "draft" | "completed") => {
    // --- AÑADIR VALIDACIÓN AQUÍ para el envío definitivo ---
    if (status === "completed") {
      const isValid = validateFormForCompletion();
      if (!isValid) {
        // validateFormForCompletion ya muestra el mensaje de error
        return; // Detiene la ejecución si la validación falla
      }
    }
    // --- Fin de la validación ---

    setIsSaving(true);
    setTopMessage(null);
    setBottomMessage(null);

    // Verifica que storage esté disponible ANTES de intentar guardar SI hay archivos adjuntos.
    // Si no hay archivos adjuntos, puede proceder incluso si storage es null (la lógica del servicio manejará eso).
    const hasFilesToUpload = Object.values(attachedFiles).some(
      (file) => file !== null
    );
    if (hasFilesToUpload && !storage) {
      // <-- Mantenemos esta verificación aquí
      console.error(
        "Firebase Storage es null. No se puede guardar el registro con archivos adjuntos."
      );
      setTopMessage({
        type: "danger",
        text: "Error: El servicio de almacenamiento de archivos no está disponible. Intenta más tarde.",
      });
      setIsSaving(false);
      return;
    }

    try {
      // Llama al servicio para guardar.
      await saveEmployeeRecord(db, storage, {
        // <-- Pasamos db y storage (que puede ser null)
        personalData,
        attachedFiles,
        status,
        userId,
        existingData,
        invitationId,
      });

      // Limpiar los archivos adjuntos locales después de un guardado exitoso
      setAttachedFiles(
        Object.keys(attachedFiles).reduce((acc, key) => {
          acc[key as FileType] = null;
          return acc;
        }, {} as Record<FileType, File | null>)
      );

      if (status === "draft") {
        // Si es borrador, cargamos los datos de nuevo para obtener las URLs de los archivos recién subidos
        // y actualizar el estado local `existingData` para que la vista muestre los enlaces actualizados.
        const updatedData = await loadEmployeeData(db, userId);
        if (updatedData) {
          setExistingData(updatedData); // Actualiza el estado con las URLs de los archivos subidos y el estado 'draft'
        }
        setTopMessage({
          type: "success",
          text: "Borrador guardado exitosamente. Puedes continuar más tarde.",
        });
        setBottomMessage(
          "Borrador guardado exitosamente. Puedes continuar más tarde."
        );
      } else {
        // status === "completed"
        // Si se envió definitivamente, la lógica de servicio ya marcó como usado y actualizó URLs.
        // Opcional: cargar de nuevo para asegurar que el estado local `existingData`
        // se actualice a 'completed' antes de redirigir, lo cual puede hacer que se
        // muestre momentáneamente la vista CompletedFormView antes de la redirección.
        const updatedData = await loadEmployeeData(db, userId);
        if (updatedData) {
          setExistingData(updatedData); // Actualiza estado a 'completed' localmente para vista CompletedFormView
        }
        setTopMessage({
          type: "success",
          text: "¡Formulario enviado con éxito! Redirigiendo...",
        });
        // Redirige DESPUÉS de actualizar el estado o un pequeño retraso
        setTimeout(() => router.push("/confirmation"), 1500); // Reduje el tiempo a 1.5s
      }
    } catch (error) {
      // Captura el error para mostrarlo
      console.error("Error during save:", error);
      setTopMessage({
        type: "danger",
        text: `Ocurrió un error al guardar. Por favor, intenta nuevamente. Detalles: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    } finally {
      setIsSaving(false);
    }
  };
  // --- Fin del Handler para guardar ---

  // Renderizado condicional
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Si el formulario ya fue completado y los datos existentes lo confirman
  if (existingData?.status === "completed") {
    return <CompletedFormView router={router} />;
  }

  // Renderiza el formulario principal si no está cargando y no está completado
  return (
    <Container className="mt-5 mb-5">
      {/* Mensaje superior */}
      {topMessage && (
        <Alert variant={topMessage.type} className="mt-3">
          {topMessage.text}
        </Alert>
      )}

      {/* Formulario */}
      <FormSection
        personalData={personalData}
        handlePersonalDataChange={handlePersonalDataChange}
        handleFileChange={handleFileChange}
        existingData={existingData}
        isSaving={isSaving} // Pasar isSaving para deshabilitar campos
      />

      {/* Botones y mensaje inferior */}
      <div className="d-flex justify-content-between mt-4">
        <Button
          variant="outline-primary"
          onClick={() => handleSave("draft")}
          disabled={isSaving} // Deshabilita mientras se guarda
        >
          {isSaving ? <SavingSpinner /> : "Guardar Borrador"}
        </Button>

        <Button
          variant="primary"
          // Llama a handleSave con status 'completed'.
          // La validación se realiza dentro de handleSave para este status.
          onClick={() => handleSave("completed")}
          disabled={isSaving} // Deshabilita mientras se guarda
        >
          {isSaving ? <SavingSpinner /> : "Enviar Definitivamente"}
        </Button>
      </div>

      {/* Mensaje inferior */}
      {bottomMessage && (
        <Alert variant="success" className="mt-3">
          {bottomMessage}
        </Alert>
      )}
    </Container>
  );
};

// ... (FormSection component and Helper functions below)

// Sección de formulario
interface FormSectionProps {
  personalData: PersonalData;
  handlePersonalDataChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileChange: (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: FileType
  ) => void;
  existingData: EmployeeData | null;
  isSaving: boolean; // Añadir isSaving a los props
}

const FormSection = ({
  personalData,
  handlePersonalDataChange,
  handleFileChange,
  existingData,
  isSaving, // Recibir isSaving
}: FormSectionProps) => {
  const documentTypes: { key: FileType; label: string }[] = [
    { key: "dniFile", label: "DNI (Frente y Dorso)" },
    { key: "carnetConducirFile", label: "Carnet de Conducir" },
    {
      key: "analiticoSecundarioFile",
      label: "Analítico de Estudios Secundarios",
    },
    { key: "aptoFisicoFile", label: "Certificado de Apto Físico" },
    { key: "buenaConductaFile", label: "Certificado de Buena Conducta" },
    { key: "examenToxicologicoFile", label: "Examen Toxicológico" },
    {
      key: "deudoresAlimentariosFile",
      label: "Certificado de No Deudor Alimentario",
    },
    {
      key: "delitosIntegridadSexualFile",
      label: "Certificado de Delitos contra la Integridad Sexual",
    },
    { key: "curriculumVitaeFile", label: "Curriculum Vitae" },
  ];

  return (
    <Row className="justify-content-md-center">
      <Col lg={10}>
        <Card className="shadow">
          <Card.Header
            className={`bg-${existingData ? "info" : "primary"} text-white`}
          >
            <Card.Title className="text-center mb-0 py-2">
              {existingData ? "Continuar Formulario" : "Nuevo Formulario"}
              {existingData?.status === "draft" && <DraftBadge />}{" "}
              {/* Mostrar Badge solo si es borrador */}
            </Card.Title>
          </Card.Header>

          <Card.Body>
            {/* Deshabilitar todo el fieldset mientras se está guardando */}
            <fieldset disabled={isSaving}>
              {/* Sección de Datos Personales */}
              <Card className="mb-4">
                <Card.Header as="h5">Datos Personales</Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    {Object.entries(personalData).map(([key, value]) => (
                      <FormField
                        key={key}
                        name={key as keyof PersonalData}
                        value={value as string}
                        label={getLabel(key)}
                        onChange={handlePersonalDataChange}
                        type={getInputType(key)}
                        required={
                          [
                            "nombre",
                            "apellido",
                            "dni",
                            "cuil",
                            "fechaNacimiento",
                            "direccion",
                            "telefono",
                            "mail",
                          ].includes(key) // Marcar como requerido solo los campos esenciales para la validación
                        }
                        readOnly={
                          key === "dni" && existingData?.status === "completed" // DNI read-only si ya se completó (aunque la vista completa se oculta antes)
                        }
                      />
                    ))}
                  </Row>
                </Card.Body>
              </Card>

              {/* Sección de Documentos */}
              <Card className="mb-4">
                <Card.Header as="h5">Documentación Requerida</Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    {documentTypes.map(({ key, label }) => (
                      <Col md={6} key={key}>
                        <Form.Group>
                          <Form.Label>{label}</Form.Label>
                          <Form.Control
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>
                            ) => handleFileChange(e, key)}
                            // Required en el input solo si es un documento requerido para completar Y no tiene URL existente
                            required={
                              [
                                "dniFile",
                                "carnetConducirFile",
                                "analiticoSecundarioFile",
                                "aptoFisicoFile",
                                "buenaConductaFile",
                                "examenToxicologicoFile",
                                "deudoresAlimentariosFile",
                                "delitosIntegridadSexualFile",
                                "curriculumVitaeFile",
                              ].includes(key) &&
                              !existingData?.documentUrls?.[
                                key as DocumentUrlKey
                              ]
                            }
                          />
                          <DocumentInfo
                            fileType={key}
                            existingData={existingData}
                          />
                        </Form.Group>
                      </Col>
                    ))}
                  </Row>
                </Card.Body>
              </Card>
            </fieldset>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

// ... (Helper functions getLabel, getInputType, getColSize below)

// Helpers
const getLabel = (key: string) => {
  const labels: Record<string, string> = {
    nombre: "Nombre",
    apellido: "Apellido",
    dni: "DNI",
    cuil: "CUIL",
    fechaNacimiento: "Fecha de Nacimiento",
    direccion: "Dirección",
    telefono: "Teléfono",
    telefonoAlternativo: "Teléfono Alternativo",
    mail: "Email",
  };
  return labels[key] || key;
};

const getInputType = (key: string) => {
  if (key === "fechaNacimiento") return "date";
  if (key === "mail") return "email";
  if (key.includes("telefono")) return "tel";
  return "text";
};

const getColSize = (key: string) => {
  if (["nombre", "apellido"].includes(key)) return 6;
  if (["dni", "cuil", "fechaNacimiento"].includes(key)) return 4;
  if (key === "direccion") return 8;
  if (key === "telefono") return 4;
  return 4;
};

export default EmployeeForm;

// // src/components/EmployeeForm.tsx
// "use client";

// import React, { useState, useEffect } from "react";
// import {
//   Container,
//   Row,
//   Col,
//   Form,
//   Button,
//   Card,
//   Spinner,
//   Alert,
// } from "react-bootstrap";
// import { db, storage } from "@/firebase/clientApp";
// import { useRouter } from "next/navigation";
// import {
//   loadEmployeeData,
//   saveEmployeeRecord,
// } from "@/services/employeeFormService";
// import {
//   EmployeeData,
//   PersonalData,
//   EmployeeFormProps,
//   DocumentUrlKey,
//   FileType,
// } from "@/types/employeeFormTypes";

// // Componentes auxiliares
// const LoadingSpinner = () => (
//   <Container className="text-center my-5">
//     <Spinner animation="border" variant="primary" />
//     <p className="mt-3">Cargando formulario...</p>
//   </Container>
// );

// const SavingSpinner = () => (
//   <>
//     <Spinner size="sm" className="me-2" />
//     Guardando...
//   </>
// );

// const DraftBadge = () => (
//   <span className="badge bg-warning text-dark ms-2">Borrador Guardado</span>
// );

// interface CompletedFormViewProps {
//   router: ReturnType<typeof useRouter>;
// }

// const CompletedFormView = ({ router }: CompletedFormViewProps) => (
//   <Container className="mt-5">
//     <Row className="justify-content-md-center">
//       <Col md={8}>
//         <Card className="text-center border-success">
//           <Card.Header className="bg-success text-white">
//             <Card.Title>Formulario Completado</Card.Title>
//           </Card.Header>
//           <Card.Body>
//             <Card.Text>
//               Ya has completado este formulario. No se permiten más
//               modificaciones.
//             </Card.Text>
//             <Button variant="primary" onClick={() => router.push("/")}>
//               Volver al inicio
//             </Button>
//           </Card.Body>
//         </Card>
//       </Col>
//     </Row>
//   </Container>
// );

// interface FormFieldProps {
//   name: keyof PersonalData;
//   value: string;
//   label: string;
//   onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
//   type?: string;
//   required?: boolean;
//   readOnly?: boolean;
// }

// const FormField = ({
//   name,
//   value,
//   label,
//   onChange,
//   type = "text",
//   required,
//   readOnly,
// }: FormFieldProps) => (
//   <Col md={getColSize(name)}>
//     <Form.Group controlId={`form${name}`}>
//       <Form.Label>{label}</Form.Label>
//       <Form.Control
//         type={type}
//         name={name}
//         value={value}
//         onChange={onChange}
//         required={required}
//         readOnly={readOnly}
//       />
//     </Form.Group>
//   </Col>
// );

// interface DocumentInfoProps {
//   fileType: DocumentUrlKey;
//   existingData: EmployeeData | null;
// }

// const DocumentInfo = ({ fileType, existingData }: DocumentInfoProps) => (
//   <>
//     <Form.Text className="text-muted">
//       {existingData?.documentUrls?.[fileType]
//         ? "Documento ya subido. Seleccione solo para actualizar"
//         : "Requerido para envío definitivo"}
//     </Form.Text>
//     {existingData?.documentUrls?.[fileType] && (
//       <div className="mt-1">
//         <a
//           href={existingData.documentUrls[fileType]!}
//           target="_blank"
//           rel="noopener noreferrer"
//           className="text-success"
//         >
//           Ver documento subido
//         </a>
//       </div>
//     )}
//   </>
// );

// // Implementación principal del componente
// const EmployeeForm: React.FC<EmployeeFormProps> = ({
//   invitationId,
//   userId,
// }) => {
//   const router = useRouter();

//   // Estado inicial
//   const [personalData, setPersonalData] = useState<PersonalData>({
//     nombre: "",
//     apellido: "",
//     dni: "",
//     cuil: "",
//     fechaNacimiento: "",
//     direccion: "",
//     telefono: "",
//     telefonoAlternativo: "",
//     mail: "",
//   });

//   const [attachedFiles, setAttachedFiles] = useState<
//     Record<DocumentUrlKey, File | null>
//   >({
//     dniFile: null,
//     carnetConducirFile: null,
//     analiticoSecundarioFile: null,
//     aptoFisicoFile: null,
//     buenaConductaFile: null,
//     examenToxicologicoFile: null,
//     deudoresAlimentariosFile: null,
//     delitosIntegridadSexualFile: null,
//     curriculumVitaeFile: null,
//   });

//   const [existingData, setExistingData] = useState<EmployeeData | null>(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [isSaving, setIsSaving] = useState(false);
//   const [topMessage, setTopMessage] = useState<{
//     type: "success" | "danger" | "info" | "warning";
//     text: string;
//   } | null>(null);
//   const [bottomMessage, setBottomMessage] = useState<string | null>(null);

//   // Cargar datos existentes
//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const data = await loadEmployeeData(db, userId);
//         if (data) {
//           setExistingData(data);
//           setPersonalData(data.personalData);
//           setTopMessage({
//             type: "info",
//             text:
//               data.status === "completed"
//                 ? "Ya has completado este formulario. No puedes realizar cambios."
//                 : "Se cargó un borrador existente. Puedes continuar editando.",
//           });
//         }
//       } catch {
//         setTopMessage({
//           type: "warning",
//           text: "No se pudieron cargar datos existentes, pero puedes continuar.",
//         });
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     fetchData();
//   }, [userId]);

//   // Manejadores
//   const handlePersonalDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { name, value } = e.target;
//     setPersonalData((prev) => ({
//       ...prev,
//       [name as keyof PersonalData]: value,
//     }));
//   };

//   const handleFileChange = (
//     e: React.ChangeEvent<HTMLInputElement>,
//     fileType: FileType
//   ) => {
//     setAttachedFiles((prev) => ({
//       ...prev,
//       [fileType]: e.target.files?.[0] || null,
//     }));
//   };

//   const handleSave = async (status: "draft" | "completed") => {
//     setIsSaving(true);
//     setTopMessage(null);
//     setBottomMessage(null);

//     if (!storage) {
//       console.error(
//         "Firebase Storage es null. No se puede guardar el registro con archivos adjuntos."
//       );
//       setTopMessage({
//         type: "danger",
//         text: "Error: El servicio de almacenamiento no está disponible. Intenta más tarde.",
//       });
//       setIsSaving(false);
//       return; // 🛑 Detiene la ejecución si storage es null
//     }
//     try {
//       await saveEmployeeRecord(db, storage, {
//         personalData,
//         attachedFiles,
//         status,
//         userId,
//         existingData,
//         invitationId,
//       });

//       if (status === "draft") {
//         setTopMessage({
//           type: "success",
//           text: "Borrador guardado exitosamente. Puedes continuar más tarde.",
//         });
//         setBottomMessage(
//           "Borrador guardado exitosamente. Puedes continuar más tarde."
//         );
//       } else {
//         setTopMessage({
//           type: "success",
//           text: "¡Formulario enviado con éxito! Redirigiendo...",
//         });
//         setTimeout(() => router.push("/confirmation"), 2000);
//       }
//     } catch {
//       setTopMessage({
//         type: "danger",
//         text: "Ocurrió un error al guardar. Por favor, intenta nuevamente.",
//       });
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   // Renderizado condicional
//   if (isLoading) {
//     return <LoadingSpinner />;
//   }

//   if (existingData?.status === "completed") {
//     return <CompletedFormView router={router} />;
//   }

//   return (
//     <Container className="mt-5 mb-5">
//       {/* Mensaje superior */}
//       {topMessage && (
//         <Alert variant={topMessage.type} className="mt-3">
//           {topMessage.text}
//         </Alert>
//       )}

//       <FormSection
//         personalData={personalData}
//         handlePersonalDataChange={handlePersonalDataChange}
//         handleFileChange={handleFileChange}
//         existingData={existingData}
//         isSaving={isSaving}
//       />

//       {/* Botones y mensaje inferior */}
//       <div className="d-flex justify-content-between mt-4">
//         <Button
//           variant="outline-primary"
//           onClick={() => handleSave("draft")}
//           disabled={isSaving}
//         >
//           {isSaving ? <SavingSpinner /> : "Guardar Borrador"}
//         </Button>

//         <Button
//           variant="primary"
//           onClick={() => handleSave("completed")}
//           disabled={isSaving}
//         >
//           {isSaving ? <SavingSpinner /> : "Enviar Definitivamente"}
//         </Button>
//       </div>

//       {/* Mensaje inferior */}
//       {bottomMessage && (
//         <Alert variant="success" className="mt-3">
//           {bottomMessage}
//         </Alert>
//       )}
//     </Container>
//   );
// };

// // Sección de formulario
// interface FormSectionProps {
//   personalData: PersonalData;
//   handlePersonalDataChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
//   handleFileChange: (
//     e: React.ChangeEvent<HTMLInputElement>,
//     fileType: FileType
//   ) => void;
//   existingData: EmployeeData | null;
//   isSaving: boolean;
// }

// const FormSection = ({
//   personalData,
//   handlePersonalDataChange,
//   handleFileChange,
//   existingData,
//   isSaving,
// }: FormSectionProps) => {
//   const documentTypes: { key: FileType; label: string }[] = [
//     { key: "dniFile", label: "DNI (Frente y Dorso)" },
//     { key: "carnetConducirFile", label: "Carnet de Conducir" },
//     {
//       key: "analiticoSecundarioFile",
//       label: "Analítico de Estudios Secundarios",
//     },
//     { key: "aptoFisicoFile", label: "Certificado de Apto Físico" },
//     { key: "buenaConductaFile", label: "Certificado de Buena Conducta" },
//     { key: "examenToxicologicoFile", label: "Examen Toxicológico" },
//     {
//       key: "deudoresAlimentariosFile",
//       label: "Certificado de No Deudor Alimentario",
//     },
//     {
//       key: "delitosIntegridadSexualFile",
//       label: "Certificado de Delitos contra la Integridad Sexual",
//     },
//     { key: "curriculumVitaeFile", label: "Curriculum Vitae" },
//   ];

//   return (
//     <Row className="justify-content-md-center">
//       <Col lg={10}>
//         <Card className="shadow">
//           <Card.Header
//             className={`bg-${existingData ? "info" : "primary"} text-white`}
//           >
//             <Card.Title className="text-center mb-0 py-2">
//               {existingData ? "Continuar Formulario" : "Nuevo Formulario"}
//               {existingData && <DraftBadge />}
//             </Card.Title>
//           </Card.Header>

//           <Card.Body>
//             <fieldset disabled={isSaving}>
//               {/* Sección de Datos Personales */}
//               <Card className="mb-4">
//                 <Card.Header as="h5">Datos Personales</Card.Header>
//                 <Card.Body>
//                   <Row className="g-3">
//                     {Object.entries(personalData).map(([key, value]) => (
//                       <FormField
//                         key={key}
//                         name={key as keyof PersonalData}
//                         value={value as string}
//                         label={getLabel(key)}
//                         onChange={handlePersonalDataChange}
//                         type={getInputType(key)}
//                         required={true}
//                         readOnly={
//                           key === "dni" && existingData?.status === "completed"
//                         }
//                       />
//                     ))}
//                   </Row>
//                 </Card.Body>
//               </Card>

//               {/* Sección de Documentos */}
//               <Card className="mb-4">
//                 <Card.Header as="h5">Documentación Requerida</Card.Header>
//                 <Card.Body>
//                   <Row className="g-3">
//                     {documentTypes.map(({ key, label }) => (
//                       <Col md={6} key={key}>
//                         <Form.Group>
//                           <Form.Label>{label}</Form.Label>
//                           <Form.Control
//                             type="file"
//                             accept=".pdf,.jpg,.jpeg,.png"
//                             onChange={(
//                               e: React.ChangeEvent<HTMLInputElement>
//                             ) => handleFileChange(e, key)}
//                             required={!existingData?.documentUrls?.[key]}
//                           />
//                           <DocumentInfo
//                             fileType={key}
//                             existingData={existingData}
//                           />
//                         </Form.Group>
//                       </Col>
//                     ))}
//                   </Row>
//                 </Card.Body>
//               </Card>
//             </fieldset>
//           </Card.Body>
//         </Card>
//       </Col>
//     </Row>
//   );
// };

// // Helpers
// const getLabel = (key: string) => {
//   const labels: Record<string, string> = {
//     nombre: "Nombre",
//     apellido: "Apellido",
//     dni: "DNI",
//     cuil: "CUIL",
//     fechaNacimiento: "Fecha de Nacimiento",
//     direccion: "Dirección",
//     telefono: "Teléfono",
//     telefonoAlternativo: "Teléfono Alternativo",
//     mail: "Email",
//   };
//   return labels[key] || key;
// };

// const getInputType = (key: string) => {
//   if (key === "fechaNacimiento") return "date";
//   if (key === "mail") return "email";
//   if (key.includes("telefono")) return "tel";
//   return "text";
// };

// const getColSize = (key: string) => {
//   if (["nombre", "apellido"].includes(key)) return 6;
//   if (["dni", "cuil", "fechaNacimiento"].includes(key)) return 4;
//   if (key === "direccion") return 8;
//   if (key === "telefono") return 4;
//   return 4;
// };

// export default EmployeeForm;

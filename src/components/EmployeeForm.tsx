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
import { db, storage } from "@/firebase/clientApp";
import { doc, setDoc, updateDoc, Timestamp, getDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/components/AuthProvider";
import type { User as FirebaseUser } from "firebase/auth";
import { useRouter } from "next/navigation";

interface CustomUser extends FirebaseUser {
  dni?: string;
}

interface PersonalData {
  nombre: string;
  apellido: string;
  dni: string;
  cuil: string;
  fechaNacimiento: string;
  direccion: string;
  telefono: string;
  telefonoAlternativo: string;
  mail: string;
}

interface DocumentUrls {
  dniFile?: string;
  carnetConducirFile?: string;
  analiticoSecundarioFile?: string;
  aptoFisicoFile?: string;
  buenaConductaFile?: string;
  examenToxicologicoFile?: string;
  deudoresAlimentariosFile?: string;
  delitosIntegridadSexualFile?: string;
  curriculumVitaeFile?: string;
}

interface EmployeeData {
  personalData: PersonalData;
  documentUrls?: DocumentUrls;
  status: "draft" | "completed";
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  submittedAt?: Timestamp;
}

interface EmployeeFormProps {
  invitationId: string;
  userId: string;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({
  invitationId,
  userId,
}) => {
  const router = useRouter();
  const { user } = useAuth() as { user: CustomUser | null };

  const [personalData, setPersonalData] = useState<PersonalData>({
    nombre: "",
    apellido: "",
    dni: user?.dni ?? "",
    cuil: "",
    fechaNacimiento: "",
    direccion: "",
    telefono: "",
    telefonoAlternativo: "",
    mail: "",
  });

  const [attachedFiles, setAttachedFiles] = useState<
    Record<string, File | null>
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
  const [message, setMessage] = useState<{
    type: "success" | "danger" | "info" | "warning";
    text: string;
  } | null>(null);
  const [firebaseReady, setFirebaseReady] = useState(false);

  // Inicializar y cargar datos existentes
  useEffect(() => {
    const initialize = async () => {
      if (!db || !storage) {
        console.warn("Firebase no está inicializado, reintentando...");
        const timer = setTimeout(() => {
          if (db && storage) {
            setFirebaseReady(true);
          } else {
            setMessage({
              type: "danger",
              text: "Error: Firebase no se inicializó. Por favor recarga la página.",
            });
          }
        }, 1000);
        return () => clearTimeout(timer);
      }

      setFirebaseReady(true);

      try {
        const employeeDataRef = doc(db, "employee-data", userId);
        const employeeSnap = await getDoc(employeeDataRef);

        if (employeeSnap.exists()) {
          const data = employeeSnap.data() as EmployeeData;
          setExistingData(data);
          setPersonalData(data.personalData);

          if (data.status === "completed") {
            setMessage({
              type: "info",
              text: "Ya has completado este formulario. No puedes realizar cambios.",
            });
          } else {
            setMessage({
              type: "info",
              text: "Se cargó un borrador existente. Puedes continuar editando.",
            });
          }
        }
      } catch (error) {
        console.error("Error cargando datos:", error);
        setMessage({
          type: "warning",
          text: "No se pudieron cargar datos existentes, pero puedes continuar.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [userId]);

  // Corrección: Cambié el tipo de evento a React.ChangeEvent<HTMLInputElement>
  const handlePersonalDataChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;
    setPersonalData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    fileType: string
  ) => {
    const file = event.target.files?.[0] ?? null;
    setAttachedFiles((prev) => ({ ...prev, [fileType]: file }));
  };

  const saveEmployeeData = async (status: "draft" | "completed") => {
    if (!firebaseReady || !db || !storage) {
      setMessage({
        type: "danger",
        text: "Firebase no está inicializado. No se pudo guardar.",
      });
      return false;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const employeeDataRef = doc(db, "employee-data", userId);
      const now = Timestamp.now();

      const dataToSave: Partial<EmployeeData> = {
        personalData,
        status,
        userId,
        updatedAt: now,
      };

      // Solo para borradores iniciales
      if (!existingData) {
        dataToSave.createdAt = now;
      }

      // Subir archivos solo cuando se completa
      if (status === "completed") {
        const fileUrls: DocumentUrls = {};
        let hasFiles = false;

        for (const [fileType, file] of Object.entries(attachedFiles)) {
          if (file) {
            const url = await uploadFile(file, userId, fileType);
            fileUrls[fileType as keyof DocumentUrls] = url;
            hasFiles = true;
          }
        }

        // Verificar que se subieron archivos si es envío final
        if (!hasFiles && !existingData?.documentUrls) {
          throw new Error("Debes subir todos los documentos requeridos");
        }

        dataToSave.documentUrls = {
          ...existingData?.documentUrls,
          ...fileUrls,
        };
        dataToSave.submittedAt = now;
      }

      await setDoc(employeeDataRef, dataToSave, { merge: true });

      // Marcar invitación como usada solo cuando se completa
      if (status === "completed") {
        const invitationRef = doc(db, "candidateInvitations", invitationId);
        await updateDoc(invitationRef, {
          used: true,
          usedAt: now,
          usedBy: userId,
        });
      }

      return true;
    } catch (error) {
      console.error(`Error guardando (${status}):`, error);

      let errorMessage = `Error al guardar como ${
        status === "draft" ? "borrador" : "completado"
      }`;
      if (error instanceof FirebaseError) {
        errorMessage += ` (${error.code}): ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }

      setMessage({ type: "danger", text: errorMessage });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    const success = await saveEmployeeData("draft");
    if (success) {
      setMessage({
        type: "success",
        text: "Borrador guardado exitosamente. Puedes continuar más tarde.",
      });
      // Actualizar estado existente
      setExistingData({
        ...(existingData || ({} as EmployeeData)),
        personalData,
        status: "draft",
        userId,
        updatedAt: Timestamp.now(),
        createdAt: existingData?.createdAt || Timestamp.now(),
      });
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const success = await saveEmployeeData("completed");
    if (success) {
      setMessage({
        type: "success",
        text: "¡Formulario enviado con éxito! Redirigiendo...",
      });

      setTimeout(() => {
        router.push("/confirmation");
      }, 2000);
    }
  };

  const uploadFile = async (
    file: File,
    userId: string,
    fileType: string
  ): Promise<string> => {
    const fileName = `${Date.now()}-${file.name}`;
    const storageRef = ref(
      storage,
      `employee-documents/${userId}/${fileType}/${fileName}`
    );

    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        null,
        (error) => reject(error),
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  };

  // Mostrar spinner si está cargando
  if (isLoading) {
    return (
      <Container className="text-center my-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Cargando formulario...</p>
      </Container>
    );
  }

  // Si ya está completado, mostrar mensaje
  if (existingData?.status === "completed") {
    return (
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
                <Card.Text>
                  <small className="text-muted">
                    Enviado el:{" "}
                    {existingData.submittedAt?.toDate().toLocaleDateString()}
                  </small>
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
  }

  return (
    <Container className="mt-5 mb-5">
      {message && (
        <Alert variant={message.type} className="mt-3">
          {message.text}
        </Alert>
      )}

      <Row className="justify-content-md-center">
        <Col lg={10}>
          <Card className="shadow">
            <Card.Header
              className={`bg-${existingData ? "info" : "primary"} text-white`}
            >
              <Card.Title className="text-center mb-0 py-2">
                {existingData ? "Continuar Formulario" : "Nuevo Formulario"}
                {existingData && (
                  <span className="badge bg-warning text-dark ms-2">
                    Borrador Guardado
                  </span>
                )}
              </Card.Title>
            </Card.Header>

            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <fieldset disabled={isSaving}>
                  {/* Sección de Datos Personales */}
                  <Card className="mb-4">
                    <Card.Header as="h5">Datos Personales</Card.Header>
                    <Card.Body>
                      <Row className="g-3">
                        <Col md={6}>
                          <Form.Group controlId="formNombre">
                            <Form.Label>Nombre</Form.Label>
                            <Form.Control
                              type="text"
                              name="nombre"
                              value={personalData.nombre}
                              onChange={handlePersonalDataChange}
                              required
                            />
                          </Form.Group>
                        </Col>

                        <Col md={6}>
                          <Form.Group controlId="formApellido">
                            <Form.Label>Apellido</Form.Label>
                            <Form.Control
                              type="text"
                              name="apellido"
                              value={personalData.apellido}
                              onChange={handlePersonalDataChange}
                              required
                            />
                          </Form.Group>
                        </Col>

                        <Col md={4}>
                          <Form.Group controlId="formDni">
                            <Form.Label>DNI</Form.Label>
                            <Form.Control
                              type="text"
                              name="dni"
                              value={personalData.dni}
                              onChange={handlePersonalDataChange}
                              required
                              readOnly={!!user?.dni}
                            />
                          </Form.Group>
                        </Col>

                        <Col md={4}>
                          <Form.Group controlId="formCuil">
                            <Form.Label>CUIL</Form.Label>
                            <Form.Control
                              type="text"
                              name="cuil"
                              value={personalData.cuil}
                              onChange={handlePersonalDataChange}
                              required
                            />
                          </Form.Group>
                        </Col>

                        <Col md={4}>
                          <Form.Group controlId="formFechaNacimiento">
                            <Form.Label>Fecha de Nacimiento</Form.Label>
                            <Form.Control
                              type="date"
                              name="fechaNacimiento"
                              value={personalData.fechaNacimiento}
                              onChange={handlePersonalDataChange}
                              required
                            />
                          </Form.Group>
                        </Col>

                        <Col md={8}>
                          <Form.Group controlId="formDireccion">
                            <Form.Label>Dirección</Form.Label>
                            <Form.Control
                              type="text"
                              name="direccion"
                              value={personalData.direccion}
                              onChange={handlePersonalDataChange}
                              required
                            />
                          </Form.Group>
                        </Col>

                        <Col md={4}>
                          <Form.Group controlId="formTelefono">
                            <Form.Label>Teléfono</Form.Label>
                            <Form.Control
                              type="tel"
                              name="telefono"
                              value={personalData.telefono}
                              onChange={handlePersonalDataChange}
                              required
                            />
                          </Form.Group>
                        </Col>

                        <Col md={4}>
                          <Form.Group controlId="formTelefonoAlternativo">
                            <Form.Label>Teléfono Alternativo</Form.Label>
                            <Form.Control
                              type="tel"
                              name="telefonoAlternativo"
                              value={personalData.telefonoAlternativo}
                              onChange={handlePersonalDataChange}
                            />
                          </Form.Group>
                        </Col>

                        <Col md={4}>
                          <Form.Group controlId="formMail">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                              type="email"
                              name="mail"
                              value={personalData.mail}
                              onChange={handlePersonalDataChange}
                              required
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>

                  {/* Sección de Documentos */}
                  <Card className="mb-4">
                    <Card.Header as="h5">Documentación Requerida</Card.Header>
                    <Card.Body>
                      <Row className="g-3">
                        {Object.entries({
                          dniFile: "DNI (Frente y Dorso)",
                          carnetConducirFile: "Carnet de Conducir",
                          analiticoSecundarioFile:
                            "Analítico de Estudios Secundarios",
                          aptoFisicoFile: "Certificado de Apto Físico",
                          buenaConductaFile: "Certificado de Buena Conducta",
                          examenToxicologicoFile: "Examen Toxicológico",
                          deudoresAlimentariosFile:
                            "Certificado de No Deudor Alimentario",
                          delitosIntegridadSexualFile:
                            "Certificado de Delitos contra la Integridad Sexual",
                          curriculumVitaeFile: "Curriculum Vitae",
                        }).map(([key, label]) => (
                          <Col md={6} key={key}>
                            <Form.Group>
                              <Form.Label>{label}</Form.Label>
                              <Form.Control
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) =>
                                  handleFileChange(
                                    e as React.ChangeEvent<HTMLInputElement>,
                                    key
                                  )
                                }
                                required={
                                  !existingData?.documentUrls?.[
                                    key as keyof DocumentUrls
                                  ]
                                }
                              />
                              <Form.Text className="text-muted">
                                {existingData?.documentUrls?.[
                                  key as keyof DocumentUrls
                                ]
                                  ? "Documento ya subido. Seleccione solo para actualizar"
                                  : "Requerido para envío definitivo"}
                              </Form.Text>
                              {existingData?.documentUrls?.[
                                key as keyof DocumentUrls
                              ] && (
                                <div className="mt-1">
                                  <a
                                    href={
                                      existingData.documentUrls[
                                        key as keyof DocumentUrls
                                      ]
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-success"
                                  >
                                    Ver documento subido
                                  </a>
                                </div>
                              )}
                            </Form.Group>
                          </Col>
                        ))}
                      </Row>
                    </Card.Body>
                  </Card>

                  <div className="d-flex justify-content-between mt-4">
                    <Button
                      variant="outline-primary"
                      onClick={handleSaveDraft}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Guardando...
                        </>
                      ) : (
                        "Guardar Borrador"
                      )}
                    </Button>

                    <Button variant="primary" type="submit" disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Enviando...
                        </>
                      ) : (
                        "Enviar Definitivamente"
                      )}
                    </Button>
                  </div>
                </fieldset>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default EmployeeForm;

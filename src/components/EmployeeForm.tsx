// src/components/EmployeeForm.tsx
"use client";

import React, { useState } from "react";
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
import { db, storage } from "@/firebase/clientApp"; // Eliminamos auth ya que no se usa
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/components/AuthProvider";
import type { User as FirebaseUser } from "firebase/auth";

// Definimos un tipo extendido para el usuario, que incluye 'dni' opcional
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

interface AttachedFiles {
  dniFile: File | null;
  carnetConducirFile: File | null;
  analiticoSecundarioFile: File | null;
  aptoFisicoFile: File | null;
  buenaConductaFile: File | null;
  examenToxicologicoFile: File | null;
  deudoresAlimentariosFile: File | null;
  delitosIntegridadSexualFile: File | null;
  curriculumVitaeFile: File | null;
}

const EmployeeForm: React.FC = () => {
  // Casteamos el user para incluir el 'dni' sin errores de TS
  const { user } = useAuth() as { user: CustomUser | null };
  const [personalData, setPersonalData] = useState<PersonalData>({
    nombre: "",
    apellido: "",
    dni: user?.dni ?? "", // Precargamos DNI si está disponible
    cuil: "",
    fechaNacimiento: "",
    direccion: "",
    telefono: "",
    telefonoAlternativo: "",
    mail: "",
  });

  const [attachedFiles, setAttachedFiles] = useState<AttachedFiles>({
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "danger";
    text: string;
  } | null>(null);

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
    fileType: keyof AttachedFiles
  ) => {
    const file = event.target.files?.[0] ?? null;
    setAttachedFiles((prev) => ({ ...prev, [fileType]: file }));
  };

  const uploadFile = async (
    file: File,
    userId: string,
    fileType: keyof AttachedFiles
  ): Promise<string> => {
    const storageRef = ref(
      storage,
      `employee-documents/${userId}/${fileType}/${file.name}`
    );

    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        null,
        (error) => reject(error),
        () =>
          getDownloadURL(uploadTask.snapshot.ref).then(resolve).catch(reject)
      );
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    if (!user) {
      setMessage({
        type: "danger",
        text: "Error: Usuario no autenticado. Por favor, vuelve a iniciar sesión.",
      });
      setIsSubmitting(false);
      return;
    }

    const userId = user.uid;

    try {
      // 1. Guardar datos en la colección "employee-data"
      const employeeDataRef = doc(db, "employee-data", userId);

      await setDoc(employeeDataRef, {
        ...personalData,
        userId: userId,
        submissionDate: Timestamp.now(),
      });

      // 2. Subir archivos y guardar URLs
      const fileUrls: Record<string, string> = {};
      const uploadPromises: Promise<void>[] = [];

      for (const [fileType, file] of Object.entries(attachedFiles)) {
        if (file) {
          uploadPromises.push(
            uploadFile(file, userId, fileType as keyof AttachedFiles).then(
              (url) => {
                fileUrls[fileType] = url;
              }
            )
          );
        }
      }

      // Esperar que todas las subidas terminen
      await Promise.all(uploadPromises);

      // 3. Actualizar con URLs de documentos
      await setDoc(
        employeeDataRef,
        {
          documentUrls: fileUrls,
        },
        { merge: true }
      );

      // 4. Actualizar estado en usuario
      const userRef = doc(db, "users", userId);
      await setDoc(
        userRef,
        {
          employeeDataCompleted: true,
          employeeDataCompletedAt: Timestamp.now(),
        },
        { merge: true }
      );

      setMessage({
        type: "success",
        text: "¡Formulario completado con éxito! Tus datos han sido guardados.",
      });
    } catch (error) {
      console.error("Error al enviar formulario:", error);

      let errorMessage = "Error desconocido al enviar el formulario";
      if (error instanceof FirebaseError) {
        errorMessage = `Error de Firebase (${error.code}): ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setMessage({
        type: "danger",
        text: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="mt-5 mb-5">
      {message && <Alert variant={message.type}>{message.text}</Alert>}

      {isSubmitting && (
        <div className="text-center my-4">
          <Spinner animation="border" />
          <p className="mt-2">Guardando tus datos...</p>
        </div>
      )}

      <Row className="justify-content-md-center">
        <Col lg={10}>
          <Card className="shadow">
            <Card.Header className="bg-primary text-white">
              <Card.Title className="text-center mb-0 py-2">
                Formulario de Datos del Empleado
              </Card.Title>
            </Card.Header>

            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <fieldset disabled={isSubmitting}>
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
                                    key as keyof AttachedFiles
                                  )
                                }
                                required
                              />
                              <Form.Text className="text-muted">
                                Formatos aceptados: PDF, JPG, PNG
                              </Form.Text>
                            </Form.Group>
                          </Col>
                        ))}
                      </Row>
                    </Card.Body>
                  </Card>

                  <div className="text-center mt-4">
                    <Button
                      variant="primary"
                      size="lg"
                      type="submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Enviando...
                        </>
                      ) : (
                        "Guardar Datos Completos"
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

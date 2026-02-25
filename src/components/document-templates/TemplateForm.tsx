/* src/components/document-templates/TemplateForm.tsx - VERSIÓN CORREGIDA */
"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "@/firebase/clientApp";
import { TemplateMetadata } from "@/types/templateTypes";
import { prepareForFirestore } from "@/utils/firestoreHelpers";

interface TemplateFormProps {
  onSuccess?: () => void;
  templateToEdit?: TemplateMetadata | null;
  onCancel?: () => void;
}

// Tipos de archivo permitidos y sus MIME types
interface AllowedFileTypes {
  [key: string]: string[];
}

const ALLOWED_FILE_TYPES: AllowedFileTypes = {
  PDF: ["application/pdf"],
  "Word (DOC/DOCX)": [
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  "Excel (XLS/XLSX)": [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  "PowerPoint (PPT/PPTX)": [
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  "Imagen (JPG/PNG)": ["image/jpeg", "image/png", "image/gif", "image/webp"],
  "Texto (TXT)": ["text/plain"],
  "Zip/Comprimido": [
    "application/zip",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
  ],
  Otro: [],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function TemplateForm({
  onSuccess,
  templateToEdit,
  onCancel,
}: TemplateFormProps) {
  const { user, userRoles } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  // Estados para el formulario
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [creator, setCreator] = useState("");
  const [fileType, setFileType] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [allowedRoles] = useState<string[]>(userRoles || []);
  const [order, setOrder] = useState(0);

  // Referencias para los inputs de archivo
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // Tipos de archivo predefinidos
  const fileTypeOptions = Object.keys(ALLOWED_FILE_TYPES);

  // Categorías predefinidas
  const categoryOptions = [
    "Normativas",
    "Formularios",
    "Informes",
    "Manuales",
    "Plantillas",
    "Presentaciones",
    "Reglamentos",
    "Otros",
  ];

  // Efecto para cargar datos en modo edición
  useEffect(() => {
    if (templateToEdit) {
      setIsEditMode(true);
      setTitle(templateToEdit.title || "");
      setDescription(templateToEdit.description || "");
      setCreator(templateToEdit.creator || "");
      setFileType(templateToEdit.fileType || "");
      setFileSize(templateToEdit.fileSize || "");
      setCategory(templateToEdit.category || "");
      setTags(templateToEdit.tags || []);
      setOrder(templateToEdit.order || 0);

      // Si hay URL de plantilla (template) existente, mostrarla como vista previa
      if (templateToEdit.templateUrl) {
        setFilePreview(templateToEdit.templateUrl);
      }

      // Si hay URL de miniatura existente, mostrarla como vista previa
      if (templateToEdit.thumbnailUrl) {
        setThumbnailPreview(templateToEdit.thumbnailUrl);
      }
    } else {
      setIsEditMode(false);
    }
  }, [templateToEdit]);

  // Validar tipo de archivo - CORREGIDO
  const validateFileType = (file: File, selectedFileType: string): boolean => {
    if (selectedFileType === "Otro") return true;

    const allowedMimeTypes = ALLOWED_FILE_TYPES[selectedFileType];
    if (!allowedMimeTypes || allowedMimeTypes.length === 0) return true;

    return allowedMimeTypes.includes(file.type);
  };

  // Formatear tamaño de archivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Manejar selección de archivo principal
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validar tamaño
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(
        `El archivo es demasiado grande. Máximo: ${formatFileSize(
          MAX_FILE_SIZE
        )}`
      );
      e.target.value = "";
      return;
    }

    // Validar tipo si ya se seleccionó uno
    if (fileType && !validateFileType(selectedFile, fileType)) {
      setError(`El archivo no coincide con el tipo seleccionado (${fileType})`);
      e.target.value = "";
      return;
    }

    setFile(selectedFile);
    setFileSize(formatFileSize(selectedFile.size));

    // Detectar tipo de archivo automáticamente si no está seleccionado
    if (!fileType) {
      const extension = selectedFile.name.toLowerCase().split(".").pop();
      const detectedType = detectFileTypeFromExtension(extension || "");
      if (detectedType) {
        setFileType(detectedType);
      }
    }

    // Crear vista previa para imágenes
    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview(null);
    }

    setError("");
  };

  // Manejar selección de miniatura
  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validar que sea imagen
    if (!selectedFile.type.startsWith("image/")) {
      setError("La miniatura debe ser una imagen (JPG, PNG, GIF, etc.)");
      e.target.value = "";
      return;
    }

    // Validar tamaño de imagen (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("La imagen de miniatura es demasiado grande. Máximo: 5MB");
      e.target.value = "";
      return;
    }

    setThumbnailFile(selectedFile);

    // Crear vista previa
    const reader = new FileReader();
    reader.onload = (e) => {
      setThumbnailPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);

    setError("");
  };

  // Detectar tipo de archivo por extensión
  const detectFileTypeFromExtension = (extension: string): string => {
    switch (extension) {
      case "pdf":
        return "PDF";
      case "doc":
      case "docx":
        return "Word (DOC/DOCX)";
      case "xls":
      case "xlsx":
        return "Excel (XLS/XLSX)";
      case "ppt":
      case "pptx":
        return "PowerPoint (PPT/PPTX)";
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
      case "webp":
        return "Imagen (JPG/PNG)";
      case "txt":
        return "Texto (TXT)";
      case "zip":
      case "rar":
      case "7z":
        return "Zip/Comprimido";
      default:
        return "Otro";
    }
  };

  // Subir archivo a Firebase Storage - CORREGIDO
  const uploadFileToStorage = async (
    file: File,
    folder: string,
    fileName: string
  ): Promise<string> => {
    try {
      if (!storage) {
        throw new Error("Firebase Storage no está inicializado");
      }

      // Crear referencia única con timestamp
      const timestamp = Date.now();
      const sanitizedFileName = fileName
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();
      const uniqueFileName = `${sanitizedFileName}_${timestamp}_${file.name.replace(
        /[^a-z0-9.]/gi,
        "_"
      )}`;
      const storageRef = ref(storage, `${folder}/${uniqueFileName}`);

      // Subir archivo
      await uploadBytes(storageRef, file);

      // Obtener URL de descarga
      const downloadURL = await getDownloadURL(storageRef);

      return downloadURL;
    } catch (error) {
      console.error("❌ Error subiendo archivo a Storage:", error);
      throw new Error(`Error al subir el archivo: ${(error as Error).message}`);
    }
  };

  // Eliminar archivo de Firebase Storage - CORREGIDO
  const deleteFileFromStorage = async (url: string): Promise<void> => {
    try {
      if (!storage) {
        console.warn("Firebase Storage no está inicializado");
        return;
      }

      // Extraer path de la URL de Storage
      const urlObj = new URL(url);
      const path = decodeURIComponent(
        urlObj.pathname.split("/o/")[1].split("?")[0]
      );
      const fileRef = ref(storage, path);

      await deleteObject(fileRef);
    } catch (error) {
      console.error("❌ Error eliminando archivo de Storage:", error);
      // No lanzar error, solo registrar
    }
  };

  // Agregar tag
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  // Eliminar tag
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  // Normalizar allowedRoles
  const normalizeAllowedRoles = (roles: string[]): string[] | null => {
    if (!roles || roles.length === 0) return null;
    return roles.map((role) => role.toString());
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    setUploadProgress(0);

    if (!user) {
      setError("Debes estar autenticado para subir plantillas");
      setLoading(false);
      return;
    }

    if (!title.trim()) {
      setError("El título es obligatorio");
      setLoading(false);
      return;
    }

    if (!isEditMode && !file) {
      setError("Debes seleccionar un archivo");
      setLoading(false);
      return;
    }

    if (!creator.trim()) {
      setError("El creador de la plantilla es obligatorio");
      setLoading(false);
      return;
    }

    if (file && fileType && !validateFileType(file, fileType)) {
      setError(`El archivo no es del tipo seleccionado (${fileType})`);
      setLoading(false);
      return;
    }

    try {
      const normalizedAllowedRoles = normalizeAllowedRoles(allowedRoles);
      let templateUrl = "";
      let thumbnailUrl = "";

      setUploadProgress(10);

      // Subir archivo principal (si hay uno nuevo)
      if (file) {
        templateUrl = await uploadFileToStorage(file, "templates", title);
        setUploadProgress(50);
      } else if (isEditMode && templateToEdit?.templateUrl) {
        // Mantener URL existente en modo edición
        templateUrl = templateToEdit.templateUrl;
      } else {
        throw new Error("No hay archivo para subir");
      }

      // Subir miniatura (si hay una nueva)
      if (thumbnailFile) {
        thumbnailUrl = await uploadFileToStorage(
          thumbnailFile,
          "thumbnails",
          `${title}_thumbnail`
        );
        setUploadProgress(80);
      } else if (isEditMode && templateToEdit?.thumbnailUrl) {
        // Mantener URL existente en modo edición
        thumbnailUrl = templateToEdit.thumbnailUrl;
      }

      const templateData: Omit<
        TemplateMetadata,
        "id" | "createdAt" | "updatedAt" | "createdBy" | "downloadCount"
      > = {
        title: title.trim(),
        description: description.trim() || undefined,
        templateUrl: templateUrl,
        thumbnailUrl: thumbnailUrl || undefined,
        creator: creator.trim(),
        fileType: fileType || "Otro",
        fileSize: fileSize || undefined,
        category: category.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        isActive: true,
        allowedRoles: normalizedAllowedRoles || undefined,
        order: order || 0,
      };

      console.log("📤 Datos de la plantilla a guardar:", templateData);

      const cleanedData = prepareForFirestore(templateData);
      setUploadProgress(90);

      if (isEditMode && templateToEdit?.id) {
        // Modo edición - actualizar plantilla existente
        const templateToSave = {
          ...cleanedData,
          updatedAt: serverTimestamp(),
        };

        console.log("🔄 Actualizando plantilla existente:", templateToEdit.id);
        await updateDoc(
          doc(db, "templates", templateToEdit.id),
          templateToSave
        );

        // Si se subió un nuevo archivo, eliminar el anterior
        if (file && templateToEdit.templateUrl) {
          await deleteFileFromStorage(templateToEdit.templateUrl);
        }

        // Si se subió una nueva miniatura, eliminar la anterior
        if (thumbnailFile && templateToEdit.thumbnailUrl) {
          await deleteFileFromStorage(templateToEdit.thumbnailUrl);
        }

        console.log("✅ Plantilla actualizada con ID:", templateToEdit.id);
        setSuccess("Plantilla actualizada exitosamente");
      } else {
        // Modo creación - agregar nueva plantilla (document-template)
        const templateToSave = {
          ...cleanedData,
          createdBy: user.uid,
          downloadCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        console.log("💾 Guardando nueva plantilla...");
        const docRef = await addDoc(
          collection(db, "templates"),
          templateToSave
        );

        console.log("✅ Plantilla guardada con ID:", docRef.id);
        setSuccess("Plantilla registrada exitosamente");
      }

      setUploadProgress(100);

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err) {
      console.error("❌ Error al guardar plantilla:", err);

      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido";

      if (errorMessage.includes("permission-denied")) {
        setError(
          "No tienes permisos para subir plantillas. Contacta al administrador."
        );
      } else if (errorMessage.includes("storage/unauthorized")) {
        setError("No tienes permisos para acceder a Firebase Storage.");
      } else if (errorMessage.includes("storage/canceled")) {
        setError("La subida del archivo fue cancelada.");
      } else if (errorMessage.includes("storage/unknown")) {
        setError("Error desconocido de Firebase Storage.");
      } else {
        setError(`Error al guardar la plantilla: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Limpiar archivo seleccionado
  const clearFile = () => {
    setFile(null);
    setFilePreview(null);
    setFileSize("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Limpiar miniatura seleccionada
  const clearThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = "";
    }
  };

  return (
    <div className="card shadow-sm">
      <div
        className={`card-header ${
          isEditMode ? "bg-warning text-dark" : "bg-primary text-white"
        }`}
      >
        <h5 className="mb-0">
          {isEditMode ? (
            <>
              <i className="bi bi-pencil me-2"></i>
              Editar Plantilla
            </>
          ) : (
            <>
              <i className="bi bi-file-earmark-plus me-2"></i>
              Subir Nueva Plantilla
            </>
          )}
        </h5>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          {error && (
            <div
              className="alert alert-danger alert-dismissible fade show"
              role="alert"
            >
              <h6 className="alert-heading">❌ Error</h6>
              <p className="mb-0">{error}</p>
              <button
                type="button"
                className="btn-close"
                onClick={() => setError("")}
                aria-label="Cerrar"
              ></button>
            </div>
          )}

          {success && (
            <div
              className="alert alert-success alert-dismissible fade show"
              role="alert"
            >
              <h6 className="alert-heading">✅ Éxito</h6>
              <p className="mb-0">{success}</p>
              <button
                type="button"
                className="btn-close"
                onClick={() => setSuccess("")}
                aria-label="Cerrar"
              ></button>
            </div>
          )}

          {/* Barra de progreso */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mb-4">
              <div className="d-flex justify-content-between mb-1">
                <small className="text-muted">Subiendo archivos...</small>
                <small className="text-muted">{uploadProgress}%</small>
              </div>
              <div className="progress" style={{ height: "6px" }}>
                <div
                  className="progress-bar progress-bar-striped progress-bar-animated"
                  role="progressbar"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="row">
            {/* Título */}
            <div className="col-md-8 mb-3">
              <label htmlFor="title" className="form-label">
                Título de la plantilla *
              </label>
              <input
                type="text"
                className="form-control"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Reglamento Interno 2024"
                required
                disabled={loading}
              />
            </div>

            {/* Categoría */}
            <div className="col-md-4 mb-3">
              <label htmlFor="category" className="form-label">
                Categoría
              </label>
              <select
                className="form-select"
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={loading}
              >
                <option value="">Seleccionar categoría...</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Archivo de la plantilla */}
            <div className="col-12 mb-3">
              <label htmlFor="templateFile" className="form-label">
                Archivo de la plantilla {!isEditMode && "*"}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                className="form-control"
                id="templateFile"
                onChange={handleFileChange}
                disabled={loading}
                required={!isEditMode}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.zip,.rar,.7z"
              />
              <div className="form-text">
                Tipos permitidos: PDF, Word, Excel, PowerPoint, Imágenes, Texto,
                Zip (Máx: {formatFileSize(MAX_FILE_SIZE)})
              </div>

              {/* Vista previa del archivo */}
              {(file || filePreview) && (
                <div className="mt-3">
                  <div className="d-flex align-items-center justify-content-between themed-surface p-3 rounded">
                    <div>
                      <strong>
                        <i className="bi bi-file-earmark me-2"></i>
                        {file ? file.name : "Archivo existente"}
                      </strong>
                      {fileSize && (
                        <div className="text-muted small">{fileSize}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={clearFile}
                      disabled={loading}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>

                  {/* Vista previa de imagen */}
                  {filePreview &&
                    (filePreview.startsWith("data:image") ||
                      filePreview.startsWith("http")) && (
                      <div className="mt-2">
                        <small className="text-muted">Vista previa:</small>
                        <img
                          src={filePreview}
                          alt="Vista previa"
                          className="img-thumbnail mt-1"
                          style={{ maxWidth: "200px", maxHeight: "150px" }}
                        />
                      </div>
                    )}
                </div>
              )}
            </div>

            {/* Creador */}
            <div className="col-md-6 mb-3">
              <label htmlFor="creator" className="form-label">
                Creador de la plantilla *
              </label>
              <input
                type="text"
                className="form-control"
                id="creator"
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
                placeholder="Ej: Departamento de RRHH, Juan Pérez, etc."
                required
                disabled={loading}
              />
              <div className="form-text">
                Persona o departamento que creó la plantilla
              </div>
            </div>

            {/* Tipo de archivo */}
            <div className="col-md-6 mb-3">
              <label htmlFor="fileType" className="form-label">
                Tipo de archivo *
              </label>
              <select
                className="form-select"
                id="fileType"
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                disabled={loading}
                required
              >
                <option value="">Seleccionar tipo...</option>
                {fileTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Descripción */}
            <div className="col-12 mb-3">
              <label htmlFor="description" className="form-label">
                Descripción
              </label>
              <textarea
                className="form-control"
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe el contenido de la plantilla, su propósito, versión, etc."
                disabled={loading}
              />
            </div>

            {/* Miniatura (opcional) */}
            <div className="col-md-6 mb-3">
              <label htmlFor="thumbnailFile" className="form-label">
                Miniatura (opcional)
              </label>
              <input
                ref={thumbnailInputRef}
                type="file"
                className="form-control"
                id="thumbnailFile"
                onChange={handleThumbnailChange}
                disabled={loading}
                accept="image/*"
              />
              <div className="form-text">
                Imagen de vista previa (JPG, PNG, GIF - Máx: 5MB)
              </div>

              {/* Vista previa de la miniatura */}
              {(thumbnailFile || thumbnailPreview) && (
                <div className="mt-3">
                  <div className="d-flex align-items-center justify-content-between">
                    <small className="text-muted">
                      Vista previa de la miniatura:
                    </small>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={clearThumbnail}
                      disabled={loading}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                  <img
                    src={thumbnailPreview || ""}
                    alt="Miniatura"
                    className="img-thumbnail mt-2"
                    style={{ maxWidth: "200px", maxHeight: "150px" }}
                  />
                </div>
              )}
            </div>

            {/* Orden */}
            <div className="col-md-3 mb-3">
              <label htmlFor="order" className="form-label">
                Orden de visualización
              </label>
              <input
                type="number"
                className="form-control"
                id="order"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                min="0"
                disabled={loading}
              />
              <div className="form-text">Menor número = aparece primero</div>
            </div>

            {/* Roles permitidos (solo información) */}
            <div className="col-md-3 mb-3">
              <label className="form-label">Roles permitidos</label>
              <div className="form-control themed-surface">
                <small>
                  {allowedRoles && allowedRoles.length > 0 ? (
                    <span className="text-success">
                      Se usarán tus roles: {allowedRoles.join(", ")}
                    </span>
                  ) : (
                    <span className="text-muted">Sin restricciones de rol</span>
                  )}
                </small>
              </div>
            </div>

            {/* Tags */}
            <div className="col-12 mb-3">
              <label className="form-label">Etiquetas</label>
              <div className="input-group mb-2">
                <input
                  type="text"
                  className="form-control"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addTag())
                  }
                  placeholder="Agregar etiqueta (ej: interno, público, borrador)"
                  disabled={loading}
                />
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={addTag}
                  disabled={loading}
                >
                  Agregar
                </button>
              </div>

              {/* Tags agregados */}
              <div className="d-flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="badge bg-primary d-flex align-items-center"
                  >
                    {tag}
                    <button
                      type="button"
                      className="btn-close btn-close-white ms-2"
                      style={{ fontSize: "0.5rem" }}
                      onClick={() => removeTag(tag)}
                      aria-label="Eliminar"
                      disabled={loading}
                    />
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Información automática */}
          <div className="alert alert-info mt-3">
            <h6 className="alert-heading">
              <i className="bi bi-info-circle me-2"></i>
              Información que se guardará automáticamente
            </h6>
            <div className="row">
              <div className="col-md-6">
                <small>
                  <strong>Subido por:</strong>{" "}
                  {user?.email || "No identificado"}
                </small>
              </div>
              <div className="col-md-6">
                <small>
                  <strong>Fecha de carga:</strong> Se registrará automáticamente
                </small>
              </div>
            </div>
            <div className="row mt-2">
              <div className="col-12">
                <small>
                  <strong>Ubicación:</strong> Los archivos se guardarán en
                  Firebase Storage
                </small>
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-between mt-4">
            <div>
              {isEditMode && onCancel && (
                <button
                  type="button"
                  className="btn btn-outline-secondary me-2"
                  onClick={onCancel}
                  disabled={loading}
                >
                  <i className="bi bi-x-circle me-1"></i>
                  Cancelar
                </button>
              )}
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  if (isEditMode && templateToEdit) {
                    // En modo edición, restaurar valores originales
                    setTitle(templateToEdit.title || "");
                    setDescription(templateToEdit.description || "");
                    setFile(null);
                    setFilePreview(templateToEdit.templateUrl || null);
                    setThumbnailFile(null);
                    setThumbnailPreview(templateToEdit.thumbnailUrl || null);
                    setCreator(templateToEdit.creator || "");
                    setFileType(templateToEdit.fileType || "");
                    setFileSize(templateToEdit.fileSize || "");
                    setCategory(templateToEdit.category || "");
                    setTags(templateToEdit.tags || []);
                    setOrder(templateToEdit.order || 0);
                  } else {
                    // En modo creación, limpiar formulario
                    setTitle("");
                    setDescription("");
                    setFile(null);
                    setFilePreview(null);
                    setThumbnailFile(null);
                    setThumbnailPreview(null);
                    setCreator("");
                    setFileType("");
                    setFileSize("");
                    setCategory("");
                    setTags([]);
                    setOrder(0);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                    if (thumbnailInputRef.current)
                      thumbnailInputRef.current.value = "";
                  }
                  setError("");
                  setSuccess("");
                  setUploadProgress(0);
                }}
                disabled={loading}
              >
                {isEditMode ? "Restaurar" : "Limpiar"}
              </button>
            </div>
            <button
              type="submit"
              className={`btn ${isEditMode ? "btn-warning" : "btn-primary"}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  {uploadProgress > 0 ? "Subiendo..." : "Guardando..."}
                </>
              ) : isEditMode ? (
                "Actualizar Plantilla"
              ) : (
                "Subir Plantilla"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

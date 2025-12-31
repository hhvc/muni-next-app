/* src/components/requirements/RequirementForm.tsx */
"use client";

import { useState, FormEvent, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/firebase/clientApp";
import { collection, addDoc, Timestamp, getDocs } from "firebase/firestore";
import {
  DestinoPrincipal,
  NaturalezaPedido,
  AppReferencia,
  ImportanciaUrgencia,
} from "@/types/requirementTypes";

interface Dashboard {
  id: string;
  title: string;
}

// Opciones para los selects
const destinosPrincipales = [
  { value: "informacion", label: "Información" },
  { value: "reporte", label: "Reporte" },
  { value: "formulario", label: "Formulario" },
  { value: "dashboard", label: "Dashboard (tablero)" },
  { value: "app", label: "App" },
  { value: "otro", label: "Otro" },
];

const naturalezasPedido = [
  { value: "informacion_estatica", label: "Información estática" },
  { value: "nuevo_desarrollo", label: "Nuevo desarrollo" },
  { value: "correccion_errores", label: "Corrección de errores" },
  { value: "mejora", label: "Mejora" },
  { value: "no_aplica", label: "No aplica" },
];

const appsReferencia = [
  { value: "rrhh", label: "RRHH" },
  { value: "d_track", label: "D-Track" },
  { value: "monitoreo", label: "Monitoreo" },
  { value: "no_aplica", label: "No aplica" },
];

const importancias = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "baja", label: "Baja" },
];

const urgencias = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "baja", label: "Baja" },
];

interface RequirementFormProps {
  horizontal?: boolean;
  onSuccess?: () => void; // Nueva prop para éxito
  onCancel?: () => void; // Nueva prop para cancelar
}

export default function RequirementForm({
  horizontal = false,
  onSuccess,
  onCancel,
}: RequirementFormProps) {
  const { user } = useAuth();

  // Estados para el formulario
  const [destinoPrincipal, setDestinoPrincipal] =
    useState<DestinoPrincipal>("informacion");
  const [naturalezaPedido, setNaturalezaPedido] = useState<NaturalezaPedido>(
    "informacion_estatica"
  );
  const [appReferencia, setAppReferencia] =
    useState<AppReferencia>("no_aplica");
  const [dashboardReferencia, setDashboardReferencia] = useState<string>("");
  const [tituloBreve, setTituloBreve] = useState("");
  const [descripcionProblema, setDescripcionProblema] = useState("");
  const [expectativaResolucion, setExpectativaResolucion] = useState("");
  const [importancia, setImportancia] = useState<ImportanciaUrgencia>("baja");
  const [urgencia, setUrgencia] = useState<ImportanciaUrgencia>("baja");
  const [fechaLimite, setFechaLimite] = useState("");
  const [usuariosQueUsaran, setUsuariosQueUsaran] = useState("");
  const [datosFuentesNecesarios, setDatosFuentesNecesarios] = useState("");
  const [metricasKPI, setMetricasKPI] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // Estados para dashboards
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loadingDashboards, setLoadingDashboards] = useState(false);

  // Estados de UI
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Cargar dashboards cuando el destino principal sea "dashboard"
  useEffect(() => {
    const fetchDashboards = async () => {
      if (destinoPrincipal !== "dashboard") return;

      try {
        setLoadingDashboards(true);
        const dashboardsRef = collection(db, "dashboards");
        const querySnapshot = await getDocs(dashboardsRef);
        const dashboardsList: Dashboard[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.isActive !== false) {
            dashboardsList.push({
              id: doc.id,
              title: data.title || "Sin título",
            });
          }
        });

        setDashboards(dashboardsList);
      } catch (err) {
        console.error("Error al cargar dashboards:", err);
      } finally {
        setLoadingDashboards(false);
      }
    };

    fetchDashboards();
  }, [destinoPrincipal]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError("Debes iniciar sesión para enviar un requerimiento.");
      return;
    }

    // Validaciones
    if (!tituloBreve.trim()) {
      setError("El título breve del requerimiento es obligatorio.");
      return;
    }

    if (!descripcionProblema.trim()) {
      setError("La descripción del problema o necesidad es obligatoria.");
      return;
    }

    if (!expectativaResolucion.trim()) {
      setError("El campo 'Qué esperas que se resuelva' es obligatorio.");
      return;
    }

    if (destinoPrincipal === "dashboard" && !dashboardReferencia) {
      setError("Debes seleccionar un dashboard de referencia.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Obtener título del dashboard si se seleccionó uno
      let dashboardTitulo = "";
      if (destinoPrincipal === "dashboard" && dashboardReferencia) {
        const selectedDashboard = dashboards.find(
          (d) => d.id === dashboardReferencia
        );
        dashboardTitulo = selectedDashboard?.title || "";
      }

      // Crear objeto base - NUNCA usar undefined, usar null o omitir el campo
      const requirementData: any = {
        // Datos del solicitante (automáticos)
        solicitante: {
          uid: user.uid,
          email: user.email || "",
          nombre: user.displayName || user.email || "Usuario",
        },
        createdBy: user.uid,
        fechaCarga: Timestamp.now(),

        // Tipo de Requerimiento
        destinoPrincipal,
        naturalezaPedido,

        // Pedido
        tituloBreve: tituloBreve.trim(),
        descripcionProblema: descripcionProblema.trim(),
        expectativaResolucion: expectativaResolucion.trim(),

        // Prioridad
        importancia,
        urgencia,

        // Sistema de seguimiento (valores iniciales)
        estado: "inicial",
        prioridad: "no_asignada",
        asignadoA: [],
        comentarios: "",

        // Historial de estados (inicial)
        historialEstados: [
          {
            estado: "inicial",
            prioridad: "no_asignada",
            fecha: Timestamp.now(),
            usuarioId: user.uid,
            usuarioNombre: user.displayName || user.email || "Usuario",
          },
        ],

        // Campos originales (para compatibilidad)
        tipo: "otros",
        detalle: `${tituloBreve} - ${descripcionProblema}`,

        // Metadatos
        updatedAt: Timestamp.now(),
        isActive: true,
      };

      // Campos condicionales - Omitir si no aplican, NO usar undefined
      if (destinoPrincipal === "app") {
        requirementData.appReferencia = appReferencia;
      }

      if (destinoPrincipal === "dashboard") {
        requirementData.dashboardReferencia = dashboardReferencia;
        requirementData.dashboardTitulo = dashboardTitulo;
      }

      if (fechaLimite) {
        requirementData.fechaLimite = Timestamp.fromDate(new Date(fechaLimite));
      }

      // Campos opcionales - solo agregar si tienen valor
      if (usuariosQueUsaran.trim()) {
        requirementData.usuariosQueUsaran = usuariosQueUsaran.trim();
      }

      if (datosFuentesNecesarios.trim()) {
        requirementData.datosFuentesNecesarios = datosFuentesNecesarios.trim();
      }

      if (metricasKPI.trim()) {
        requirementData.metricasKPI = metricasKPI.trim();
      }

      if (observaciones.trim()) {
        requirementData.observaciones = observaciones.trim();
      }

      console.log("Enviando requerimiento:", requirementData);
      await addDoc(collection(db, "requirements"), requirementData);

      // Mostrar éxito y resetear formulario
      setSuccess(true);

      // Resetear todos los campos
      setDestinoPrincipal("informacion");
      setNaturalezaPedido("informacion_estatica");
      setAppReferencia("no_aplica");
      setDashboardReferencia("");
      setTituloBreve("");
      setDescripcionProblema("");
      setExpectativaResolucion("");
      setImportancia("baja");
      setUrgencia("baja");
      setFechaLimite("");
      setUsuariosQueUsaran("");
      setDatosFuentesNecesarios("");
      setMetricasKPI("");
      setObservaciones("");

      // Llamar a onSuccess si está definido
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1000); // Esperar 1 segundo para mostrar el mensaje de éxito
      } else {
        // Si no hay onSuccess, ocultar el mensaje después de 5 segundos
        setTimeout(() => setSuccess(false), 5000);
      }
    } catch (err) {
      console.error("Error al guardar el requerimiento:", err);
      const firebaseError = err as { code?: string; message?: string };

      if (firebaseError.message?.includes("permission-denied")) {
        setError(
          "No tienes permisos para crear requerimientos. Contacta al administrador."
        );
      } else if (firebaseError.message?.includes("invalid data")) {
        setError(
          "Hay datos inválidos en el formulario. Por favor, revisa los campos."
        );
      } else {
        setError(
          "Ocurrió un error al guardar el requerimiento. Por favor, inténtalo de nuevo."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para manejar la cancelación
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  // Renderizar campos condicionales
  const renderCampoAppReferencia = () => {
    if (destinoPrincipal !== "app") return null;

    return (
      <div className={horizontal ? "col-12 col-lg-4" : "mb-3"}>
        <label htmlFor="appReferencia" className="form-label">
          App a la que hace referencia *
        </label>
        <select
          id="appReferencia"
          className="form-select themed-select"
          value={appReferencia}
          onChange={(e) => setAppReferencia(e.target.value as AppReferencia)}
          required={destinoPrincipal === "app"}
        >
          {appsReferencia.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderCampoDashboardReferencia = () => {
    if (destinoPrincipal !== "dashboard") return null;

    return (
      <div className={horizontal ? "col-12 col-lg-4" : "mb-3"}>
        <label htmlFor="dashboardReferencia" className="form-label">
          Dashboard de referencia *
        </label>
        <select
          id="dashboardReferencia"
          className="form-select themed-select"
          value={dashboardReferencia}
          onChange={(e) => setDashboardReferencia(e.target.value)}
          required={destinoPrincipal === "dashboard"}
          disabled={loadingDashboards}
        >
          <option value="">Seleccionar dashboard...</option>
          {dashboards.map((dashboard) => (
            <option key={dashboard.id} value={dashboard.id}>
              {dashboard.title}
            </option>
          ))}
        </select>
        {loadingDashboards && (
          <div className="form-text">
            <span className="spinner-border spinner-border-sm me-2"></span>
            Cargando dashboards...
          </div>
        )}
        {!loadingDashboards && dashboards.length === 0 && (
          <div className="form-text text-warning">
            No hay dashboards disponibles en el sistema.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Nuevo Requerimiento de Datos</h5>
        {onCancel && (
          <button
            type="button"
            className="btn btn-sm btn-light"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        )}
      </div>

      <div className="card-body">
        {success && (
          <div
            className="alert alert-success alert-dismissible fade show"
            role="alert"
          >
            <i className="bi bi-check-circle me-2"></i>
            Requerimiento enviado correctamente. Nos pondremos en contacto
            contigo.
            <button
              type="button"
              className="btn-close"
              onClick={() => setSuccess(false)}
            />
          </div>
        )}

        {error && (
          <div
            className="alert alert-danger alert-dismissible fade show"
            role="alert"
          >
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
            <button
              type="button"
              className="btn-close"
              onClick={() => setError("")}
            />
          </div>
        )}

        {/* Información del solicitante */}
        <div className="alert alert-info mb-4">
          <h6 className="alert-heading">
            <i className="bi bi-person-circle me-2"></i>
            Datos del Solicitante
          </h6>
          <div className="row">
            <div className="col-md-6">
              <small>
                <strong>Nombre:</strong>{" "}
                {user?.displayName || user?.email || "No identificado"}
              </small>
            </div>
            <div className="col-md-6">
              <small>
                <strong>Email:</strong> {user?.email || "No disponible"}
              </small>
            </div>
          </div>
          <div className="row mt-2">
            <div className="col-12">
              <small>
                <strong>Fecha de carga:</strong> Se registrará automáticamente
                al enviar
              </small>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={`row ${horizontal ? "g-3" : ""}`}>
            {/* SECCIÓN 1: Tipo de Requerimiento */}
            <div className="col-12">
              <h6 className="border-bottom pb-2 mb-3">
                <i className="bi bi-card-checklist me-2"></i>
                Tipo de Requerimiento
              </h6>
            </div>

            {/* Destino principal */}
            <div className={horizontal ? "col-12 col-lg-4" : "mb-3"}>
              <label htmlFor="destinoPrincipal" className="form-label">
                Destino principal *
              </label>
              <select
                id="destinoPrincipal"
                className="form-select themed-select"
                value={destinoPrincipal}
                onChange={(e) =>
                  setDestinoPrincipal(e.target.value as DestinoPrincipal)
                }
                required
              >
                {destinosPrincipales.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Naturaleza del pedido */}
            <div className={horizontal ? "col-12 col-lg-4" : "mb-3"}>
              <label htmlFor="naturalezaPedido" className="form-label">
                Naturaleza del pedido *
              </label>
              <select
                id="naturalezaPedido"
                className="form-select themed-select"
                value={naturalezaPedido}
                onChange={(e) =>
                  setNaturalezaPedido(e.target.value as NaturalezaPedido)
                }
                required
              >
                {naturalezasPedido.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Campos condicionales */}
            {renderCampoAppReferencia()}
            {renderCampoDashboardReferencia()}

            {/* SECCIÓN 2: Pedido */}
            <div className="col-12 mt-4">
              <h6 className="border-bottom pb-2 mb-3">
                <i className="bi bi-clipboard-plus me-2"></i>
                Pedido
              </h6>
            </div>

            {/* Título breve */}
            <div className="col-12 mb-3">
              <label htmlFor="tituloBreve" className="form-label">
                Título breve del requerimiento *
              </label>
              <input
                type="text"
                id="tituloBreve"
                className="form-control"
                value={tituloBreve}
                onChange={(e) => setTituloBreve(e.target.value)}
                placeholder="Ej: Reporte mensual de ventas automatizado"
                required
              />
            </div>

            {/* Descripción del problema */}
            <div className="col-12 mb-3">
              <label htmlFor="descripcionProblema" className="form-label">
                Descripción del problema o necesidad *
              </label>
              <textarea
                id="descripcionProblema"
                className="form-control"
                rows={3}
                value={descripcionProblema}
                onChange={(e) => setDescripcionProblema(e.target.value)}
                placeholder="Describe detalladamente el problema o necesidad que quieres resolver"
                required
              />
            </div>

            {/* Qué esperas que se resuelva */}
            <div className="col-12 mb-3">
              <label htmlFor="expectativaResolucion" className="form-label">
                Qué esperas que se resuelva *
              </label>
              <textarea
                id="expectativaResolucion"
                className="form-control"
                rows={2}
                value={expectativaResolucion}
                onChange={(e) => setExpectativaResolucion(e.target.value)}
                placeholder="Ej.: automatización, visualización de KPI, integración, etc."
                required
              />
            </div>

            {/* SECCIÓN 3: Prioridad */}
            <div className="col-12 mt-4">
              <h6 className="border-bottom pb-2 mb-3">
                <i className="bi bi-flag me-2"></i>
                Prioridad
              </h6>
            </div>

            {/* Importancia y Urgencia */}
            <div className={horizontal ? "col-12 col-lg-3" : "col-md-6 mb-3"}>
              <label htmlFor="importancia" className="form-label">
                Importancia *
              </label>
              <select
                id="importancia"
                className="form-select themed-select"
                value={importancia}
                onChange={(e) =>
                  setImportancia(e.target.value as ImportanciaUrgencia)
                }
                required
              >
                {importancias.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={horizontal ? "col-12 col-lg-3" : "col-md-6 mb-3"}>
              <label htmlFor="urgencia" className="form-label">
                Urgencia *
              </label>
              <select
                id="urgencia"
                className="form-select themed-select"
                value={urgencia}
                onChange={(e) =>
                  setUrgencia(e.target.value as ImportanciaUrgencia)
                }
                required
              >
                {urgencias.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha límite */}
            <div className={horizontal ? "col-12 col-lg-3" : "col-md-6 mb-3"}>
              <label htmlFor="fechaLimite" className="form-label">
                Fecha límite (opcional)
              </label>
              <input
                type="date"
                id="fechaLimite"
                className="form-control"
                value={fechaLimite}
                onChange={(e) => setFechaLimite(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            {/* SECCIÓN 4: Detalles adicionales */}
            <div className="col-12 mt-4">
              <h6 className="border-bottom pb-2 mb-3">
                <i className="bi bi-info-circle me-2"></i>
                Detalles adicionales (opcionales)
              </h6>
            </div>

            {/* Usuarios que lo van a usar */}
            <div className="col-12 mb-3">
              <label htmlFor="usuariosQueUsaran" className="form-label">
                Usuarios que lo van a usar
              </label>
              <input
                type="text"
                id="usuariosQueUsaran"
                className="form-control"
                value={usuariosQueUsaran}
                onChange={(e) => setUsuariosQueUsaran(e.target.value)}
                placeholder="Ej: Equipo de ventas, Gerencia, etc."
              />
            </div>

            {/* Datos o fuentes necesarios */}
            <div className="col-12 mb-3">
              <label htmlFor="datosFuentesNecesarios" className="form-label">
                Datos o fuentes necesarios
              </label>
              <textarea
                id="datosFuentesNecesarios"
                className="form-control"
                rows={2}
                value={datosFuentesNecesarios}
                onChange={(e) => setDatosFuentesNecesarios(e.target.value)}
                placeholder="Ej: Datos de CRM, planilla Excel, sistema de facturación, etc."
              />
            </div>

            {/* Métrica/KPI a incluir */}
            <div className="col-12 mb-3">
              <label htmlFor="metricasKPI" className="form-label">
                Métrica/KPI a incluir
              </label>
              <input
                type="text"
                id="metricasKPI"
                className="form-control"
                value={metricasKPI}
                onChange={(e) => setMetricasKPI(e.target.value)}
                placeholder="Ej: Ventas mensuales, tasa de conversión, etc."
              />
            </div>

            {/* Observaciones */}
            <div className="col-12 mb-3">
              <label htmlFor="observaciones" className="form-label">
                Observaciones
              </label>
              <textarea
                id="observaciones"
                className="form-control"
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Cualquier otra información relevante"
              />
            </div>
          </div>

          <div className="d-flex justify-content-between mt-4">
            <div>
              {onCancel && (
                <button
                  type="button"
                  className="btn btn-secondary me-2"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  <i className="bi bi-x-circle me-1"></i>
                  Cancelar
                </button>
              )}
              <span className="text-muted small align-self-center">
                <i className="bi bi-info-circle me-1"></i>
                Los campos marcados con * son obligatorios
              </span>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Enviando...
                </>
              ) : (
                <>
                  <i className="bi bi-send me-2"></i>
                  Enviar Requerimiento
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
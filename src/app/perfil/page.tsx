// src/app/perfil/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/clientApp";
import Image from "next/image";
import LoadingSpinner from "@/components/LoadingSpinner";

interface UserProfileData {
  id: string;
  email: string;
  displayName: string;
  dni?: string;
  photoURL?: string;
  primaryRole: string;
  roles: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export default function PerfilPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedPrimaryRole, setSelectedPrimaryRole] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Cargar datos del perfil desde Firestore
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) {
        router.push("/");
        return;
      }

      try {
        setLoading(true);
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          const userData: UserProfileData = {
            id: userDoc.id,
            email: data.email || user.email || "",
            displayName: data.displayName || user.displayName || "Sin nombre",
            dni: data.dni || "",
            photoURL: data.photoURL || user.photoURL || "",
            primaryRole:
              data.primaryRole || data.role || "pending_verification",
            roles: Array.isArray(data.roles)
              ? data.roles
              : [data.role || "pending_verification"],
            createdAt: data.createdAt?.toDate() || null,
            updatedAt: data.updatedAt?.toDate() || null,
          };
          setUserProfile(userData);
          setSelectedPrimaryRole(userData.primaryRole);
        } else {
          // Si no existe el documento, crear uno básico
          const userData: UserProfileData = {
            id: user.uid,
            email: user.email || "",
            displayName: user.displayName || "Sin nombre",
            photoURL: user.photoURL || "",
            primaryRole: "pending_verification",
            roles: ["pending_verification"],
          };
          setUserProfile(userData);
          setSelectedPrimaryRole("pending_verification");
        }
      } catch (err) {
        console.error("Error al cargar perfil:", err);
        setError("Error al cargar los datos del perfil");
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [user, router]);

  // Manejar cambio de rol principal
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    setSelectedPrimaryRole(newRole);
    setSuccessMessage(""); // Limpiar mensaje anterior
  };

  // Guardar cambios del rol principal
  const handleSaveRole = async () => {
    if (
      !user ||
      !userProfile ||
      selectedPrimaryRole === userProfile.primaryRole
    ) {
      return;
    }

    // Verificar que el rol seleccionado esté en la lista de roles del usuario
    if (!userProfile.roles.includes(selectedPrimaryRole)) {
      setError("El rol seleccionado no está entre tus roles asignados");
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        primaryRole: selectedPrimaryRole,
        role: selectedPrimaryRole, // Mantener compatibilidad
        updatedAt: new Date(),
      });

      // Actualizar estado local
      setUserProfile({
        ...userProfile,
        primaryRole: selectedPrimaryRole,
      });

      setSuccessMessage("Rol principal actualizado correctamente");

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (err) {
      console.error("Error al actualizar rol:", err);
      setError(`Error al actualizar rol: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  // Formatear fecha
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "No disponible";
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Obtener color para badge según rol
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "root":
        return "danger";
      case "admin":
        return "warning text-dark";
      case "hr":
        return "primary";
      case "data":
        return "info";
      case "collaborator":
        return "success";
      case "guardiaurbana":
        return "dark";
      case "pending_verification":
        return "secondary";
      default:
        return "light text-dark";
    }
  };

  // Si no hay usuario, redirigir
  useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);

  if (loading) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="text-center py-5">
              <LoadingSpinner />
              <p className="mt-3 text-muted">Cargando perfil...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="container py-4">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="alert alert-danger">
              No se pudo cargar la información del perfil.
            </div>
            <button className="btn btn-secondary" onClick={() => router.back()}>
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card shadow">
            <div className="card-header themed-surface">
              <h2 className="card-title mb-0">
                <i className="bi bi-person-circle me-2"></i>
                Mi Perfil
              </h2>
            </div>

            <div className="card-body">
              {/* Mensajes de error/éxito */}
              {error && (
                <div className="alert alert-danger alert-dismissible fade show mb-4">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {error}
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setError("")}
                  ></button>
                </div>
              )}

              {successMessage && (
                <div className="alert alert-success alert-dismissible fade show mb-4">
                  <i className="bi bi-check-circle me-2"></i>
                  {successMessage}
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setSuccessMessage("")}
                  ></button>
                </div>
              )}

              {/* Información principal con foto */}
              <div className="text-center mb-4">
                <div className="position-relative d-inline-block">
                  {userProfile.photoURL ? (
                    <Image
                      src={userProfile.photoURL}
                      alt={userProfile.displayName}
                      width={120}
                      height={120}
                      className="rounded-circle border border-4 border-primary"
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      className="rounded-circle bg-secondary d-flex align-items-center justify-content-center"
                      style={{ width: "120px", height: "120px" }}
                    >
                      <i
                        className="bi bi-person text-white"
                        style={{ fontSize: "3rem" }}
                      ></i>
                    </div>
                  )}
                </div>
                <h3 className="mt-3">{userProfile.displayName}</h3>
                <p className="text-muted">{userProfile.email}</p>
              </div>

              <div className="row">
                {/* Columna izquierda - Información personal */}
                <div className="col-md-6">
                  <div className="card mb-4">
                    <div className="card-header themed-surface">
                      <h5 className="mb-0">
                        <i className="bi bi-info-circle me-2"></i>
                        Información Personal
                      </h5>
                    </div>
                    <div className="card-body">
                      <div className="mb-3">
                        <label className="form-label text-muted small">
                          Nombre completo
                        </label>
                        <p className="form-control-static fw-semibold">
                          {userProfile.displayName}
                        </p>
                      </div>

                      <div className="mb-3">
                        <label className="form-label text-muted small">
                          Email
                        </label>
                        <p className="form-control-static">
                          {userProfile.email}
                        </p>
                      </div>

                      {userProfile.dni && (
                        <div className="mb-3">
                          <label className="form-label text-muted small">
                            DNI
                          </label>
                          <p className="form-control-static">
                            {userProfile.dni}
                          </p>
                        </div>
                      )}

                      <div className="mb-3">
                        <label className="form-label text-muted small">
                          Fecha de creación
                        </label>
                        <p className="form-control-static">
                          <i className="bi bi-calendar-plus me-1"></i>
                          {formatDate(userProfile.createdAt)}
                        </p>
                      </div>

                      <div className="mb-0">
                        <label className="form-label text-muted small">
                          Última actualización
                        </label>
                        <p className="form-control-static">
                          <i className="bi bi-clock-history me-1"></i>
                          {formatDate(userProfile.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Columna derecha - Roles y permisos */}
                <div className="col-md-6">
                  <div className="card mb-4">
                    <div className="card-header themed-surface">
                      <h5 className="mb-0">
                        <i className="bi bi-shield-check me-2"></i>
                        Roles y Permisos
                      </h5>
                    </div>
                    <div className="card-body">
                      {/* Rol principal actual */}
                      <div className="mb-4">
                        <label className="form-label text-muted small">
                          Rol principal actual
                        </label>
                        <div className="d-flex align-items-center gap-2">
                          <span
                            className={`badge bg-${getRoleBadgeColor(
                              userProfile.primaryRole,
                            )} fs-6`}
                          >
                            {userProfile.primaryRole}
                          </span>
                          <span
                            className="text-success"
                            title="Rol principal activo"
                          >
                            <i className="bi bi-star-fill"></i>
                          </span>
                        </div>
                      </div>

                      {/* Cambiar rol principal */}
                      <div className="mb-4">
                        <label className="form-label">
                          <i className="bi bi-arrow-left-right me-1"></i>
                          Cambiar rol principal
                        </label>
                        <div className="d-flex gap-2 mb-2">
                          <select
                            className="form-select"
                            value={selectedPrimaryRole}
                            onChange={handleRoleChange}
                            disabled={saving || userProfile.roles.length <= 1}
                          >
                            {userProfile.roles.map((role) => (
                              <option key={role} value={role}>
                                {role}{" "}
                                {role === userProfile.primaryRole
                                  ? "(actual)"
                                  : ""}
                              </option>
                            ))}
                          </select>
                          <button
                            className="btn btn-primary"
                            onClick={handleSaveRole}
                            disabled={
                              saving ||
                              selectedPrimaryRole === userProfile.primaryRole ||
                              userProfile.roles.length <= 1
                            }
                          >
                            {saving ? (
                              <>
                                <span
                                  className="spinner-border spinner-border-sm me-2"
                                  role="status"
                                ></span>
                                Guardando...
                              </>
                            ) : (
                              "Guardar"
                            )}
                          </button>
                        </div>
                        <small className="text-muted">
                          {userProfile.roles.length <= 1
                            ? "Tienes solo un rol asignado"
                            : "Puedes cambiar tu rol principal entre los roles que tienes asignados"}
                        </small>
                      </div>

                      {/* Todos los roles asignados */}
                      <div>
                        <label className="form-label text-muted small">
                          Todos tus roles asignados
                        </label>
                        <div className="d-flex flex-wrap gap-2">
                          {userProfile.roles.map((role, index) => (
                            <span
                              key={index}
                              className={`badge bg-${getRoleBadgeColor(
                                role,
                              )} d-flex align-items-center gap-1`}
                            >
                              {role}
                              {role === userProfile.primaryRole && (
                                <i
                                  className="bi bi-star-fill"
                                  title="Rol principal"
                                ></i>
                              )}
                            </span>
                          ))}
                        </div>
                        <small className="text-muted d-block mt-2">
                          <i className="bi bi-info-circle me-1"></i>
                          Estos son todos los roles que tienes asignados en el
                          sistema
                        </small>
                      </div>
                    </div>
                  </div>

                  {/* Información del sistema */}
                  <div className="card">
                    <div className="card-header themed-surface">
                      <h5 className="mb-0">
                        <i className="bi bi-gear me-2"></i>
                        Información del Sistema
                      </h5>
                    </div>
                    <div className="card-body">
                      <div className="alert alert-info mb-0">
                        <h6>
                          <i className="bi bi-lightbulb me-2"></i>¿Qué es el rol
                          principal?
                        </h6>
                        <p className="small mb-2">
                          El rol principal se usa para mejorar el sistema:
                        </p>
                        <ul className="small mb-0">
                          <li>
                            Define la interfaz o dashboard que verás por defecto
                            al ingresar
                          </li>
                          <li>
                            Puedes cambiarlo si tienes múltiples roles asignados
                          </li>
                          <li>
                            Para obtener nuevos roles, contacta a un
                            administrador
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="d-flex justify-content-between mt-4 pt-3 border-top">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => router.back()}
                >
                  <i className="bi bi-arrow-left me-1"></i>
                  Volver
                </button>

                <div className="d-flex gap-2">
                  {/* <button
                    className="btn btn-outline-primary"
                    onClick={() => router.push("/dashboard")}
                  >
                    <i className="bi bi-speedometer2 me-1"></i>
                    Ir al Dashboard
                  </button> */}

                  <button
                    className="btn btn-outline-info"
                    onClick={() => {
                      setSelectedPrimaryRole(userProfile.primaryRole);
                      setError("");
                      setSuccessMessage("");
                    }}
                  >
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    Restablecer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

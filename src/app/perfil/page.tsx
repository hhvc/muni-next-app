// src/app/perfil/page.tsx
"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PerfilPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card shadow">
            <div className="card-header bg-primary text-white">
              <h2 className="card-title mb-0">Editar Perfil</h2>
            </div>
            <div className="card-body">
              <div className="alert alert-info">
                <h5>Página en Desarrollo</h5>
                <p className="mb-0">
                  La funcionalidad de edición de perfil estará disponible
                  próximamente.
                </p>
              </div>

              <div className="mb-3">
                <label className="form-label">Nombre</label>
                <input
                  type="text"
                  className="form-control"
                  value={user.displayName || ""}
                  disabled
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={user.email || ""}
                  disabled
                />
              </div>

              <button
                className="btn btn-secondary"
                onClick={() => router.back()}
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

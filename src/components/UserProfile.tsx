// src/components/UserProfile.tsx
"use client";

import { useAuth } from "@/components/AuthProvider";
import UserProfileDropdown from "./UserProfileDropdown";

export default function UserProfile() {
  const { user, userRole } = useAuth();

  // No mostrar si no hay usuario autenticado
  if (!user) {
    return null;
  }

  return (
    <div className="user-profile">
      <UserProfileDropdown user={user} userRole={userRole || "Sin rol"} />
    </div>
  );
}

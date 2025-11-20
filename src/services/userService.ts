// src/services/userService.ts
import {
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  arrayUnion,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase/clientApp";
import { User } from "firebase/auth";

export interface PlatformUser {
  displayName: string;
  email: string;
  photoURL: string;
  dni: string;
  role: string;
  invitationCode: string;
  invitationDocId: string;
  createdAt: Timestamp | null;
  lastLoginAt: Timestamp | null;
  updatedAt: Timestamp | null;
  loginHistory: Timestamp[];
  isActive: boolean;
  userType: "platform" | "candidate";
}

export const createPlatformUser = async (user: User): Promise<void> => {
  if (!user) throw new Error("Usuario no válido");

  try {
    console.log("🔹 Verificando existencia de usuario:", user.uid);
    const userRef = doc(db, "users", user.uid);

    const existingUser = await getDoc(userRef);

    if (existingUser.exists()) {
      console.log(
        "ℹ️ Usuario ya existe en Firestore, actualizando último login"
      );
      await updateUserLastLogin(user.uid);
      return;
    }

    console.log("🔹 Creando nuevo usuario en Firestore...");

    // ⭐ CORREGIDO: Usar Timestamp.now() para el array inicial
    const userData = {
      displayName: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      dni: "",
      role: "nuevo",
      invitationCode: "no",
      invitationDocId: "",
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      // ⭐ CORREGIDO: Usar Timestamp.now() en lugar de serverTimestamp() para arrays
      loginHistory: [Timestamp.now()],
      updatedAt: serverTimestamp(),
      isActive: true,
      userType: "platform" as const,
    };

    await setDoc(userRef, userData);
    console.log("✅ Usuario de plataforma creado exitosamente:", user.uid);
  } catch (error) {
    console.error("❌ Error creando usuario de plataforma:", error);
    throw error;
  }
};

export const updateUserLastLogin = async (userId: string): Promise<void> => {
  if (!userId) return;

  try {
    const userRef = doc(db, "users", userId);

    // ⭐ MEJORADO: Usar setDoc con merge en lugar de updateDoc para evitar conflictos
    await setDoc(
      userRef,
      {
        lastLoginAt: serverTimestamp(),
        loginHistory: arrayUnion(Timestamp.now()),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    console.log("✅ Último login actualizado para usuario:", userId);
  } catch (error) {
    console.error("❌ Error actualizando último login:", error);
    throw error;
  }
};

export const getUserData = async (
  userId: string
): Promise<PlatformUser | null> => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return null;
    }

    const data = userDoc.data();

    return {
      displayName: data.displayName || "",
      email: data.email || "",
      photoURL: data.photoURL || "",
      dni: data.dni || "",
      role: data.role || "nuevo",
      invitationCode: data.invitationCode || "no",
      invitationDocId: data.invitationDocId || "",
      createdAt: data.createdAt || null,
      lastLoginAt: data.lastLoginAt || null,
      updatedAt: data.updatedAt || null,
      loginHistory: data.loginHistory || [],
      isActive: data.isActive !== undefined ? data.isActive : true,
      userType: data.userType || "platform",
    } as PlatformUser;
  } catch (error) {
    console.error("Error obteniendo datos de usuario:", error);
    throw error;
  }
};

// Función auxiliar para verificar si un usuario existe
export const checkUserExists = async (userId: string): Promise<boolean> => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    return userDoc.exists();
  } catch (error) {
    console.error("Error verificando existencia de usuario:", error);
    return false;
  }
};

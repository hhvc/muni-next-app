// src/services/employeeFormService.ts
import {
  doc,
  setDoc,
  updateDoc,
  Timestamp,
  getDoc,
  Firestore,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  FirebaseStorage,
} from "firebase/storage";

import {
  EmployeeData,
  DocumentUrls,
  PersonalData,
} from "@/types/employeeFormTypes";

export const loadEmployeeData = async (
  db: Firestore,
  userId: string
): Promise<EmployeeData | null> => {
  try {
    const docRef = doc(db, "employee-data", userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as EmployeeData) : null;
  } catch (error) {
    console.error("Error loading employee data:", error);
    throw new Error("Failed to load employee data");
  }
};

export const saveEmployeeRecord = async (
  db: Firestore,
  storage: FirebaseStorage,
  data: {
    personalData: PersonalData;
    attachedFiles: Record<string, File | null>;
    status: "draft" | "completed";
    userId: string;
    existingData: EmployeeData | null;
    invitationId: string;
  }
): Promise<{ success: boolean; documentUrls?: DocumentUrls }> => {
  const {
    personalData,
    attachedFiles,
    status,
    userId,
    existingData,
    invitationId,
  } = data;
  const docRef = doc(db, "employee-data", userId);
  const now = Timestamp.now();

  const recordData: Partial<EmployeeData> = {
    personalData,
    status,
    userId,
    updatedAt: now,
  };

  if (!existingData) {
    recordData.createdAt = now;
  }

  const documentUrls: DocumentUrls = { ...existingData?.documentUrls };

  try {
    if (status === "completed") {
      for (const [fileType, file] of Object.entries(attachedFiles)) {
        if (file) {
          const url = await uploadFile(storage, file, userId, fileType);
          documentUrls[fileType as keyof DocumentUrls] = url;
        }
      }
      recordData.documentUrls = documentUrls;
      recordData.submittedAt = now;

      const invitationRef = doc(db, "candidateInvitations", invitationId);
      await updateDoc(invitationRef, {
        used: true,
        usedAt: now,
        usedBy: userId,
      });
    }

    await setDoc(docRef, recordData, { merge: true });
    return { success: true, documentUrls };
  } catch (error) {
    console.error("Error saving employee record:", error);
    throw new Error("Failed to save employee record");
  }
};

export const uploadFile = async (
  storage: FirebaseStorage,
  file: File,
  userId: string,
  fileType: string
): Promise<string> => {
  try {
    const fileName = `${Date.now()}-${file.name}`;
    const storageRef = ref(
      storage,
      `employee-documents/${userId}/${fileType}/${fileName}`
    );
    await uploadBytesResumable(storageRef, file);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error(`Error uploading ${fileType}:`, error);
    throw new Error(`Failed to upload file: ${fileType}`);
  }
};

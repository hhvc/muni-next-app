// src/components/FirestoreTest.tsx
"use client";
import { useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/clientApp";

export default function FirestoreTest() {
  useEffect(() => {
    const testFirestore = async () => {
      if (!db) return;

      try {
        const testDoc = doc(db, "test", "connection");
        const docSnap = await getDoc(testDoc);
        console.log(
          "Firestore test result:",
          docSnap.exists() ? docSnap.data() : "No document"
        );
      } catch (error) {
        console.error("Firestore test error:", error);
      }
    };

    testFirestore();
  }, []);

  return <div>Probando conexión a Firestore...</div>;
}

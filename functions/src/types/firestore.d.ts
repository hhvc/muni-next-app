// functions/src/types/firestore.d.ts

// Importamos el tipo original de Firestore de la librería firebase-admin
import { Firestore as AdminFirestore } from "firebase-admin/firestore";

// Declaramos un módulo de aumento para 'firebase-admin/firestore'.
// Esto le dice a TypeScript que vamos a añadir algo a este módulo existente.
declare module "firebase-admin/firestore" {
  // Extendemos el tipo AdminFirestore para añadir el método 'instance'.
  // Definimos su firma básica: toma un string (el databaseId)
  // y devuelve una instancia de Firestore (AdminFirestore).
  interface Firestore extends AdminFirestore {
    instance(databaseId: string): AdminFirestore;
  }
}

// Nota: Este archivo no genera JavaScript. Es solo para el compilador de TypeScript.
// No necesitas importarlo en ningún lado de tu código .ts/.tsx.

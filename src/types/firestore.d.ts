// Importamos el tipo original de Firestore de la librería firebase-admin
import { Firestore as AdminFirestore } from "firebase-admin/firestore";

// Declaramos un módulo de aumento para 'firebase-admin/firestore'.
declare module "firebase-admin/firestore" {
  // Extendemos el tipo AdminFirestore para añadir el método 'instance'.
  interface Firestore extends AdminFirestore {
    instance(databaseId: string): AdminFirestore;
  }
}

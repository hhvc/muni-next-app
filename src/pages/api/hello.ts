import { NextApiRequest, NextApiResponse } from "next";

// Esta es la función que maneja las peticiones a esta ruta API
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Solo permitimos peticiones GET a esta ruta
  if (req.method === "GET") {
    // Enviamos una respuesta con estado 200 (OK) y un JSON
    res
      .status(200)
      .json({ message: "¡Hola desde tu API Route en Firebase App Hosting!" });
  } else {
    // Para cualquier otro método (POST, PUT, etc.), respondemos con "Method Not Allowed"
    res.setHeader("Allow", ["GET"]); // Indicamos qué métodos están permitidos
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

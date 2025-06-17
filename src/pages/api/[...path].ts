import type { NextApiRequest, NextApiResponse } from "next";
import { IncomingHttpHeaders } from "http"; // Importa el tipo para req.headers

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ✅ CORREGIDO: Permitir proxy SOLO cuando la variable NEXT_PUBLIC_FIREBASE_EMULATOR es 'true'
  // Esto asegura que el proxy solo se usa en el entorno de desarrollo local con emuladores activados.
  // Si no estamos en modo emulador, o si la función proxy se ejecuta en producción por error,
  // devolvemos un error 403 Forbidden.
  if (process.env.NEXT_PUBLIC_FIREBASE_EMULATOR !== "true") {
    console.warn("Proxy attempted when Firebase Emulator flag is not true.");
    return res
      .status(403)
      .json({
        error: "Proxy only available when Firebase Emulator is enabled",
      });
  }

  // Obtener el path de la API desde los parámetros de la URL
  // req.query.path es un array de strings por la sintaxis de Next.js [...path].ts
  const pathSegments = (req.query.path as string[]) || [];
  // Unimos los segmentos para formar el nombre de la función a la que queremos hacer proxy
  // Por ejemplo, si la URL es /api/myFunction/some/path, functionName será "myFunction/some/path"
  const functionName = pathSegments.join("/");

  // Configurar la URL de destino para la función en el emulador
  // Dado que ya validamos que NEXT_PUBLIC_FIREBASE_EMULATOR es 'true', siempre apuntamos al emulador.
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const region = "us-central1"; // ✨ IMPORTANTE: Asegúrate de que esta región coincida EXACTAMENTE con la región de tus funciones en functions/src/index.ts ✨
  // Las funciones HTTP/Callable del emulador se invocan en el formato:
  // http://127.0.0.1:5001/PROJECT_ID/REGION/FUNCTION_NAME
  const targetUrl = `http://127.0.0.1:5001/${projectId}/${region}/${functionName}`;

  try {
    // --- Preparación de los Encabezados para la Solicitud fetch ---
    // Construimos un nuevo objeto de encabezados que sea compatible con la API fetch.
    // fetch espera Record<string, string> o un array de arrays [string, string].
    // req.headers puede contener undefined o string[] para algunos encabezados.
    const headersToSend: Record<string, string> = {};

    // Iteramos sobre los encabezados originales de la solicitud entrante de Next.js
    const reqHeaders = req.headers as IncomingHttpHeaders; // Casteamos para mejor tipado

    for (const key in reqHeaders) {
      // Obtenemos el valor del encabezado
      const value = reqHeaders[key];

      // Solo incluimos encabezados que tienen un valor definido (no undefined)
      if (value !== undefined) {
        let headerValue: string;

        if (Array.isArray(value)) {
          // Si el valor es un array de strings (ej: múltiples Set-Cookie o Via), los unimos.
          // Unir con ', ' es una práctica común para representar múltiples valores de encabezado en una sola línea.
          headerValue = value.join(", ");
        } else {
          // Si el valor ya es un string, lo usamos directamente.
          headerValue = value;
        }

        // Agregamos el encabezado procesado a nuestro objeto headersToSend.
        // Convertimos la clave a minúsculas, ya que los nombres de encabezado HTTP no distinguen entre mayúsculas y minúsculas.
        headersToSend[key.toLowerCase()] = headerValue;
      }
    }

    // --- Eliminación de Encabezados Problemáticos ---
    // Eliminamos encabezados que fetch gestiona automáticamente o que podrían causar problemas en el proxy.
    delete headersToSend["host"]; // El encabezado 'host' debe ser el del targetUrl, fetch lo pone solo.
    // delete headersToSend['content-length']; // fetch calcula y establece esto si hay un body.
    // delete headersToSend['transfer-encoding']; // fetch gestiona la codificación de transferencia.
    // delete headersToSend['connection']; // Las conexiones persistentes son manejadas por fetch/Node.js.

    // --- Configuración/Sobrescritura de Encabezados Específicos ---
    // Opcional: Si siempre esperas que el cuerpo de la solicitud entrante sea JSON, puedes establecer este encabezado.
    // Si la solicitud original ya tenía un Content-Type, esta línea lo sobrescribiría.
    // headersToSend['content-type'] = 'application/json';

    // --- Realizar la Solicitud fetch a la Función de Destino ---
    const response = await fetch(targetUrl, {
      method: req.method, // Usamos el mismo método HTTP que la solicitud entrante
      headers: headersToSend, // Pasamos los encabezados que preparamos
      // Incluimos el body solo para métodos que lo permiten (POST, PUT, PATCH, DELETE, etc.)
      // y solo si req.body tiene contenido. Stringify lo convierte a JSON.
      body:
        req.method !== "GET" &&
        req.method !== "HEAD" &&
        req.body !== undefined &&
        req.body !== null
          ? JSON.stringify(req.body) // Asumimos que el body entrante es JSON o serializable a JSON
          : undefined, // No body para GET/HEAD o si req.body está vacío
    });

    // --- Manejar la Respuesta de la Función de Destino ---
    const contentType = response.headers.get("content-type");
    let responseData;

    // Parseamos la respuesta según su Content-Type para enviar los datos en el formato correcto.
    if (contentType && contentType.includes("application/json")) {
      try {
        responseData = await response.json(); // Intentamos parsear como JSON
      } catch (jsonError) {
        // Si falla el parseo JSON (ej: la función devolvió un error con Content-Type JSON pero el cuerpo no es JSON válido),
        // registramos el error y tratamos de leer el cuerpo como texto plano.
        console.error(
          "🔥 Error parsing JSON response from target function:",
          jsonError
        );
        responseData = await response.text();
      }
    } else {
      // Si no es JSON, leemos el cuerpo como texto plano.
      responseData = await response.text();
    }

    // --- Reenviar la Respuesta al Cliente que Llamó a esta API Route ---
    // Copiamos los encabezados de la respuesta de la función al objeto de respuesta de Next.js.
    response.headers.forEach((value, name) => {
      // res.setHeader(name, value); // Esta línea estaba en la versión anterior, pero puede causar problemas si se duplican encabezados.
      // Un enfoque más seguro es:
      // Si el encabezado no es "Content-Type" (ya que lo manejamos al determinar cómo parsear el body)
      // y no es "Content-Length" (Node.js lo establece automáticamente),
      // o si necesitas sobrescribir encabezados, puedes usar setHeader.
      // Para simplificar y evitar errores comunes, a menudo se omiten algunos encabezados o se copian selectivamente.
      // Copiemos todos excepto Content-Encoding que fetch ya maneja y Host que no aplica.
      if (
        name.toLowerCase() !== "content-encoding" &&
        name.toLowerCase() !== "host"
      ) {
        res.setHeader(name, value);
      }
    });
    // Nos aseguramos de enviar el Content-Type correcto basado en cómo leímos el cuerpo.
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    } else if (typeof responseData === "string") {
      // Si leímos como texto y no había Content-Type original, establecemos uno por defecto.
      res.setHeader("Content-Type", "text/plain");
    } else if (typeof responseData === "object") {
      // Si el parseo JSON fue exitoso y no había Content-Type original, establecemos uno por defecto.
      res.setHeader("Content-Type", "application/json");
    }

    // Establecemos el código de estado de la respuesta al mismo que el de la función.
    res.status(response.status).send(responseData); // Enviamos los datos procesados.
  } catch (error) {
    // --- Manejo de Errores ---
    // Si algo sale mal durante el proceso de fetch o manejo de respuesta, registramos el error
    console.error(
      "🔥 Error in API proxy call to Firebase Function:",
      targetUrl,
      error
    );
    // Y devolvemos un error 500 al cliente.
    // Incluimos detalles del error solo en entornos que no son de producción por seguridad.
    res.status(500).json({
      error: "Internal proxy error calling Firebase Function",
      details:
        process.env.NODE_ENV !== "production"
          ? error instanceof Error
            ? error.message
            : String(error) // Convertimos el error a string si no es un Error object
          : undefined, // No exponer detalles sensibles en producción
    });
  }
}

export const convertGoogleDriveUrl = (url: string): string => {
  if (!url) return "";

  // Si NO es de Google Drive, devolverla sin cambios
  if (!url.includes("drive.google.com")) {
    return url;
  }

  // Extraer ID del archivo
  const match =
    url.match(/\/d\/([^\/]+)/) || // formato /file/d/ID/
    url.match(/[?&]id=([^&]+)/); // formato ?id=ID

  if (match?.[1]) {
    return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }

  return url;
};

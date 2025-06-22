// app/empleados/[id]/page.tsx
import DetalleEmpleadoClient from "./DetalleEmpleadoClient";

export default async function Page({ params }: { params: { id: string } }) {
  return <DetalleEmpleadoClient id={params.id} />;
}

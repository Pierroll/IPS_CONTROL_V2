// /lib/apiperu.ts
import "server-only";

export async function obtenerNombreCompleto(dni: string): Promise<string | null> {
  if (!/^\d{8}$/.test(dni)) return null;

  const token = process.env.APIPERU_TOKEN!;
  const res = await fetch("https://apiperu.dev/api/dni", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ dni }),
    cache: "no-store",
  });

  const json = await res.json().catch(() => null);
  return json?.success && json?.data?.nombre_completo ? json.data.nombre_completo : null;
}
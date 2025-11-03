import { NextResponse } from "next/server";
import { obtenerNombreCompleto } from "@/lib/apiperu";

export async function POST(req: Request) {
  const { dni } = await req.json();

  if (!dni || typeof dni !== "string" || !/^\d{8}$/.test(dni)) {
    return NextResponse.json({ nombre_completo: null, error: "DNI inválido. Debe contener 8 dígitos." }, { status: 400 });
  }

  try {
    const nombre = await obtenerNombreCompleto(dni);
    return NextResponse.json({ nombre_completo: nombre });
  } catch (error) {
    console.error("Error al consultar API Perú:", error);
    return NextResponse.json({ nombre_completo: null, error: "Error al obtener el nombre. Intenta de nuevo." }, { status: 500 });
  }
}
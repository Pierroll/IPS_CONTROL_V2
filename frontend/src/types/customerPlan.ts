export interface CreateCustomerPlanPayload {
  customerId: string
  planId: string
  startDate: string // Cadena en formato ISO
  endDate?: Date | string
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'CANCELLED'
  changeType?: 'NEW' | 'UPGRADE' | 'DOWNGRADE' | 'LATERAL' | 'SUSPENSION' | 'REACTIVATION'
  changeReason?: string
  notes?: string
  changedBy?: string
}

// customerPlan.ts
export function buildCreateCustomerPlanPayload(
  customerId: string,
  planId: string,
  startDateStr: string,
  planNotes: string,
  userId: string | null
): CreateCustomerPlanPayload {
  if (!startDateStr) {
    console.error("startDateStr está vacío:", startDateStr)
    throw new Error("La fecha de inicio no puede estar vacía")
  }
  const startDate = new Date(startDateStr)
  if (isNaN(startDate.getTime())) {
    console.error("Fecha de inicio inválida:", startDateStr)
    throw new Error("La fecha de inicio proporcionada no es válida")
  }
  const payload = {
    customerId,
    planId,
    startDate: startDateStr, // Enviar solo YYYY-MM-DD
    status: "ACTIVE",
    changeType: "NEW",
    notes: planNotes || null,
    changedBy: userId,
  }
  console.log("Payload creado en buildCreateCustomerPlanPayload:", JSON.stringify(payload, null, 2))
  return payload
}
"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Customer } from "@/types/customer"
import { Plan } from "@/types/plans"
import { CreateInvoicePayload, InvoiceItem } from "@/types/billing"
import api from "@/lib/apiFacade"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"

type Props = {
  open: boolean
  onClose: () => void
  customers: Customer[]
  plans: Plan[]
  onCreated: () => void
}

export default function CreateInvoiceModal({ open, onClose, customers, plans, onCreated }: Props) {
  const [loading, setLoading] = React.useState(false)
  const [customerId, setCustomerId] = React.useState<string>("")
  const [periodStart, setPeriodStart] = React.useState<string>("")
  const [periodEnd, setPeriodEnd] = React.useState<string>("")
  const [notes, setNotes] = React.useState("")
  const [items, setItems] = React.useState<InvoiceItem[]>([
    { description: "", quantity: 1, unitPrice: 0, planId: undefined, ticketId: undefined, total: 0, id: "" } as any,
  ])

  const [tax, setTax] = React.useState<number>(0)
  const [discount, setDiscount] = React.useState<number>(0)

  const addItem = () => setItems((arr) => [...arr, { description: "", quantity: 1, unitPrice: 0 } as any])
  const removeItem = (idx: number) => setItems((arr) => arr.filter((_, i) => i !== idx))
  const updateItem = (idx: number, patch: Partial<InvoiceItem>) =>
    setItems((arr) =>
      arr.map((it, i) => (i === idx ? { ...it, ...patch, total: Number((patch.quantity ?? it.quantity) as any) * Number((patch.unitPrice ?? it.unitPrice) as any) } : it))
    )

  const subtotal = items.reduce((acc, it) => acc + Number(it.quantity || 0) * Number(it.unitPrice || 0), 0)
  const total = subtotal + Number(tax || 0) - Number(discount || 0)

  const onSubmit = async () => {
    if (!customerId || !periodStart || !periodEnd || items.length === 0) return
    setLoading(true)
    try {
      const payload: CreateInvoicePayload = {
        customerId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        items: items.map((i) => ({
          description: i.description || "Servicio",
          quantity: Number(i.quantity || 0),
          unitPrice: Number(i.unitPrice || 0),
          planId: i.planId || undefined,
          ticketId: i.ticketId || undefined,
        })),
        tax: Number(tax || 0),
        discount: Number(discount || 0),
        notes,
        currency: "PEN",
      }
      await api.createInvoice(payload)
      onCreated()
      onClose()
    } catch (e: any) {
      alert(e?.message || "Error al crear factura")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nueva Factura</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Selecciona cliente" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Periodo (inicio)</Label>
            <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Periodo (fin)</Label>
            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
          </div>
        </div>

        <Card className="mt-4">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Items</h4>
              <Button variant="outline" onClick={addItem}>Agregar ítem</Button>
            </div>

            {items.map((it, idx) => (
              <div key={idx} className="grid md:grid-cols-12 gap-2 items-end">
                <div className="md:col-span-5">
                  <Label>Descripción</Label>
                  <Input value={it.description || ""} onChange={(e) => updateItem(idx, { description: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label>Cantidad</Label>
                  <Input type="number" step="0.01" value={it.quantity as any} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} />
                </div>
                <div className="md:col-span-2">
                  <Label>P. Unitario</Label>
                  <Input type="number" step="0.01" value={it.unitPrice as any} onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })} />
                </div>
                <div className="md:col-span-2">
                  <Label>Plan (opcional)</Label>
                  <Select value={it.planId || ""} onValueChange={(v) => updateItem(idx, { planId: v || undefined })}>
                    <SelectTrigger><SelectValue placeholder="Sin plan" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin plan</SelectItem>
                      {plans.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-1 flex gap-2">
                  <Button variant="ghost" onClick={() => removeItem(idx)}>🗑️</Button>
                </div>
              </div>
            ))}

            <div className="grid md:grid-cols-3 gap-3 pt-2 border-t">
              <div>
                <Label>Impuesto</Label>
                <Input type="number" step="0.01" value={tax as any} onChange={(e) => setTax(Number(e.target.value))} />
              </div>
              <div>
                <Label>Descuento</Label>
                <Input type="number" step="0.01" value={discount as any} onChange={(e) => setDiscount(Number(e.target.value))} />
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Subtotal: S/ {subtotal.toFixed(2)}</span>
                <span className="font-semibold">Total: S/ {total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={loading || !customerId || !periodStart || !periodEnd || items.length === 0}>
            {loading ? "Creando..." : "Crear factura"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { supabase } from "@/integrations/supabase/client";

export interface StockMovementInput {
  orgId: string;
  itemId: string;
  changeQty: number; // negative = stock out, positive = stock in
  balanceAfter?: number | null;
  reason: string;
  refType?: "invoice" | "credit_note" | "adjustment" | "manual" | "bill" | "grn" | "delivery_challan" | null;
  refId?: string | null;
  refNumber?: string | null;
  createdBy?: string | null;
  batchNo?: string | null;
  expiryDate?: string | null;
  unitCost?: number | null;
}

/** Insert a batch of stock movements. Best-effort: errors are swallowed but logged. */
export async function logStockMovements(movements: StockMovementInput[]) {
  if (!movements.length) return;
  const rows = movements.map((m) => ({
    org_id: m.orgId,
    item_id: m.itemId,
    change_qty: m.changeQty,
    balance_after: m.balanceAfter ?? null,
    reason: m.reason,
    ref_type: m.refType ?? null,
    ref_id: m.refId ?? null,
    ref_number: m.refNumber ?? null,
    created_by: m.createdBy ?? null,
    batch_no: m.batchNo ?? null,
    expiry_date: m.expiryDate ?? null,
    unit_cost: m.unitCost ?? null,
  }));
  const { error } = await (supabase as any).from("stock_movements").insert(rows);
  if (error) console.warn("stock movement log failed:", error.message);
}

/** Detect which line items would push stock below zero. Returns warnings array. */
export async function detectNegativeStock(
  lineItems: { item_id: string | null; quantity: number; name: string }[],
  options: { restorePrevQty?: Record<string, number> } = {}
): Promise<{ name: string; available: number; requested: number }[]> {
  const restore = options.restorePrevQty || {};
  const needs: Record<string, number> = {};
  for (const l of lineItems) {
    if (!l.item_id || !l.quantity) continue;
    needs[l.item_id] = (needs[l.item_id] || 0) + Number(l.quantity);
  }
  const ids = Object.keys(needs);
  if (!ids.length) return [];
  const { data } = await supabase
    .from("items")
    .select("id, name, type, stock_quantity")
    .in("id", ids);
  const warnings: { name: string; available: number; requested: number }[] = [];
  for (const it of data || []) {
    if (it.type !== "product") continue;
    const effective = Number(it.stock_quantity || 0) + Number(restore[it.id] || 0);
    const requested = needs[it.id];
    if (requested > effective) {
      warnings.push({ name: it.name, available: effective, requested });
    }
  }
  return warnings;
}

/**
 * Restores inventory stock for all product line items of an invoice.
 * Used when an invoice is cancelled, voided, or deleted.
 */
export async function restoreInvoiceStock(
  invoiceId: string,
  orgId: string,
  reason: string = "Invoice Cancelled / Restocked",
  refNumber?: string,
  userId?: string
): Promise<{ restoredCount: number }> {
  try {
    // 1. Check if invoice exists and has deduct_stock enabled
    const { data: inv } = await supabase
      .from("invoices")
      .select("id, deduct_stock, status, invoice_number")
      .eq("id", invoiceId)
      .maybeSingle();

    if (inv && (inv as any).deduct_stock === false) {
      // Stock was never deducted for this invoice
      return { restoredCount: 0 };
    }

    // 2. Fetch all invoice line items
    const { data: lines } = await supabase
      .from("invoice_lines")
      .select("item_id, quantity")
      .eq("invoice_id", invoiceId);

    if (!lines || lines.length === 0) return { restoredCount: 0 };

    // Group quantities by item_id
    const qtyByItem: Record<string, number> = {};
    for (const l of lines) {
      if (l.item_id && Number(l.quantity) > 0) {
        qtyByItem[l.item_id] = (qtyByItem[l.item_id] || 0) + Number(l.quantity);
      }
    }

    const itemIds = Object.keys(qtyByItem);
    if (itemIds.length === 0) return { restoredCount: 0 };

    // 3. Fetch current product items
    const { data: items } = await supabase
      .from("items")
      .select("id, type, stock_quantity")
      .in("id", itemIds);

    const movements: StockMovementInput[] = [];
    let restoredCount = 0;

    for (const it of items || []) {
      if (it.type !== "product") continue;
      const qtyToRestore = qtyByItem[it.id] || 0;
      if (qtyToRestore <= 0) continue;

      const currentStock = Number(it.stock_quantity || 0);
      const newStock = currentStock + qtyToRestore;

      // Update item stock in DB
      await supabase
        .from("items")
        .update({ stock_quantity: newStock })
        .eq("id", it.id);

      movements.push({
        orgId,
        itemId: it.id,
        changeQty: qtyToRestore, // Positive = restocked
        balanceAfter: newStock,
        reason: reason || "Invoice Cancelled / Restocked",
        refType: "invoice",
        refId: invoiceId,
        refNumber: refNumber || (inv?.invoice_number || ""),
        createdBy: userId || null,
      });

      restoredCount += qtyToRestore;
    }

    // 4. Log stock movements
    if (movements.length > 0) {
      await logStockMovements(movements);
    }

    return { restoredCount };
  } catch (err) {
    console.error("Failed to restore invoice stock:", err);
    return { restoredCount: 0 };
  }
}

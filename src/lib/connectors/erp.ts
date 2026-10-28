import { z } from "zod";
import type { ErpOrder } from "../types";

const OrderSchema = z.array(
  z.object({
    customerId: z.string(),
    customerName: z.string(),
    date: z.string(),
    tons: z.number(),
    value: z.number(),
  }),
);

/**
 * O ERP da Trufer ainda não tem contrato de API definido. Enquanto isso, o conector
 * espera um endpoint (ou job de sincronização) que devolva pedidos neste formato.
 */
export async function fetchErpOrders(): Promise<ErpOrder[] | null> {
  const url = process.env.ERP_API_URL;
  if (!url) return null;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.ERP_API_KEY ?? ""}` },
    next: { revalidate: 1800 },
  });
  if (!res.ok) throw new Error(`ERP ${res.status}`);
  return OrderSchema.parse(await res.json());
}

import { createFileRoute } from "@tanstack/react-router";

type AnyObj = Record<string, any>;

const num = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function detectType(p: AnyObj): "cashin" | "cashout" | "refund" | null {
  const status = String(p.status ?? "").toUpperCase();
  if (status === "MED") return "refund";
  if (p.beneficiaryname || p.beneficiary_name || p.pixkey || p.pix_key) return "cashout";
  if (p.client_name || p.paymentcode) return "cashin";
  return null;
}

function isAcceptedStatus(type: string, status: string): boolean {
  const s = status.toUpperCase();
  if (type === "cashin") return s === "PAID_OUT" || s === "PAID";
  if (type === "cashout") return s === "COMPLETED" || s === "PAID_OUT";
  if (type === "refund") return true;
  return false;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export const Route = createFileRoute("/api/public/syncpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: AnyObj;
        try {
          payload = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }

        // Optional shared-secret validation (header or query)
        const expectedSecret = process.env.SYNCPAY_WEBHOOK_SECRET;
        if (expectedSecret) {
          const provided =
            request.headers.get("x-syncpay-secret") ||
            request.headers.get("x-webhook-secret") ||
            new URL(request.url).searchParams.get("secret");
          if (provided !== expectedSecret) {
            return json({ error: "Unauthorized" }, 401);
          }
        }

        const type = detectType(payload);
        if (!type) return json({ error: "Unrecognized payload" }, 400);

        const rawStatus = String(payload.status ?? "");
        if (!isAcceptedStatus(type, rawStatus)) {
          // Acknowledge but skip persistence for non-final statuses
          return json({ status: "ignored", reason: `status=${rawStatus}` }, 200);
        }

        const transactionId =
          payload.idtransaction ||
          payload.transaction_id ||
          payload.transactionId ||
          payload.id;
        if (!transactionId) return json({ error: "Missing transaction id" }, 400);

        const row = {
          transaction_id: String(transactionId),
          external_reference:
            payload.externalreference ?? payload.external_reference ?? null,
          type,
          status: rawStatus.toUpperCase(),
          amount: num(payload.amount) ?? 0,
          liquid_amount:
            num(payload.deposito_liquido) ??
            num(payload.liquid_amount) ??
            num(payload.net_amount),
          taxa_deposito: num(payload.taxa_deposito),
          taxa_adquirente: num(payload.taxa_adquirente),
          client_name: payload.client_name ?? null,
          client_email: payload.client_email ?? null,
          client_document: payload.client_document ?? null,
          beneficiary_name:
            payload.beneficiaryname ?? payload.beneficiary_name ?? null,
          pix_key: payload.pixkey ?? payload.pix_key ?? null,
          data_registro: payload.data_registro ?? null,
          raw_payload: payload,
        };

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const { error } = await supabaseAdmin
          .from("syncpay_transactions")
          .upsert(row, { onConflict: "transaction_id" });

        if (error) {
          console.error("[syncpay-webhook] DB error:", error);
          return json({ error: error.message }, 500);
        }

        return json({ status: "success" }, 200);
      },
    },
  },
});

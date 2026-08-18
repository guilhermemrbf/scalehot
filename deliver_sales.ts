import { supabaseAdmin } from "./src/integrations/supabase/client.server.js";

async function run() {
  const txIds = ['d6c81d86-b631-45fb-baa2-e7c1ce037f5b', 'feacb9ae-87de-4726-bea0-225e295a76d6', 'd515f6cb-0a00-444f-bd78-41ff6968e69c'];
  const clientId = 'cdf600dd-729f-488a-87c8-a1e808588bec';

  console.log("Entregando vendas no painel...");
  
  const { data, error } = await supabaseAdmin
    .from("transactions")
    .update({ 
      employee_visible: true, 
      employee_client_id: clientId 
    })
    .in("transaction_id", txIds);

  if (error) {
    console.error("Erro ao atualizar vendas:", error);
    process.exit(1);
  }

  console.log("Vendas entregues com sucesso!");
}

run();

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, CreditCard, ShieldCheck, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/checkout/$linkId")({
  component: CheckoutPage,
});

function CheckoutPage() {
  const { linkId } = Route.useParams();
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [step, setStep] = useState(1);

  return (
    <div className="min-h-screen bg-[#080808] text-white p-4 md:p-8 flex items-center justify-center font-sans">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Lado Esquerdo: Resumo do Produto */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="size-5" />
            <span className="font-display font-bold text-lg uppercase tracking-wider">ScaleUp Pay</span>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-4xl font-display font-bold">Produto Digital Premium</h1>
            <p className="text-muted-foreground">Acesso vitalício à plataforma ScaleUp e todas as ferramentas de crescimento.</p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
              <span className="text-muted-foreground">Subtotal</span>
              <span>R$ 197,00</span>
            </div>
            <div className="flex justify-between items-center text-2xl font-bold">
              <span>Total</span>
              <span className="text-primary">R$ 197,00</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Lock className="size-4" />
            <span>Pagamento 100% seguro e criptografado</span>
          </div>
        </div>

        {/* Lado Direito: Formulário de Pagamento */}
        <Card className="p-6 md:p-8 bg-[#121212] border-white/5 shadow-2xl">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setMethod("pix")}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${method === "pix" ? "border-primary bg-primary/10 text-primary" : "border-white/5 bg-white/5 text-muted-foreground hover:bg-white/10"}`}
              >
                <QrCode className="size-6" />
                <span className="text-xs font-bold uppercase tracking-widest">PIX</span>
              </button>
              <button 
                onClick={() => setMethod("card")}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${method === "card" ? "border-primary bg-primary/10 text-primary" : "border-white/5 bg-white/5 text-muted-foreground hover:bg-white/10"}`}
              >
                <CreditCard className="size-6" />
                <span className="text-xs font-bold uppercase tracking-widest">Cartão</span>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {method === "pix" ? (
                <motion.div 
                  key="pix" 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label>Nome Completo</Label>
                        <Input className="bg-white/5 border-white/10 h-12" placeholder="Digite seu nome" />
                      </div>
                      <div className="space-y-2">
                        <Label>E-mail</Label>
                        <Input className="bg-white/5 border-white/10 h-12" placeholder="seu@email.com" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center gap-4 py-4 bg-white/5 rounded-2xl">
                    <div className="size-48 bg-white p-2 rounded-xl">
                      <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=ScaleUpPay-Mock" alt="QR Code" />
                    </div>
                    <p className="text-xs text-muted-foreground text-center px-8">Escaneie o código acima ou copie o código Pix abaixo para pagar.</p>
                    <Button className="w-full max-w-[200px] variant-outline border-white/10">Copiar Código</Button>
                  </div>

                  <Button className="w-full bg-primary h-14 font-bold text-lg">Paguei o Pix</Button>
                </motion.div>
              ) : (
                <motion.div 
                  key="card" 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Número do Cartão</Label>
                      <Input className="bg-white/5 border-white/10 h-12" placeholder="0000 0000 0000 0000" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Validade</Label>
                        <Input className="bg-white/5 border-white/10 h-12" placeholder="MM/AA" />
                      </div>
                      <div className="space-y-2">
                        <Label>CVV</Label>
                        <Input className="bg-white/5 border-white/10 h-12" placeholder="123" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Nome no Cartão</Label>
                      <Input className="bg-white/5 border-white/10 h-12" placeholder="NOME COMO NO CARTÃO" />
                    </div>
                  </div>
                  <Button className="w-full bg-primary h-14 font-bold text-lg">Finalizar Pagamento</Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </div>
    </div>
  );
}

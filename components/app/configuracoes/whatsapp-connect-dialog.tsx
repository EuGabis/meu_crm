"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function WhatsappConnectDialog({
  open,
  onOpenChange,
  onConectado,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConectado: (info: { phoneNumber: string | null }) => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function pararPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function iniciarPolling() {
    pararPolling();
    pollRef.current = setInterval(async () => {
      const res = await fetch("/api/whatsapp/status", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === "open") {
        pararPolling();
        onConectado({ phoneNumber: data.phoneNumber ?? null });
        onOpenChange(false);
      }
    }, 2000);
  }

  async function iniciar() {
    setErro(null);
    setCarregando(true);
    setQr(null);
    try {
      const res = await fetch("/api/whatsapp/connect", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQr(data.base64 ?? null);
      iniciarPolling();
    } catch {
      setErro(
        "Não foi possível gerar o QR code. Verifique a Evolution API e tente novamente."
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- abre o modal e já dispara a busca do QR code
      iniciar();
    } else {
      pararPolling();
    }
    return () => pararPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp</DialogTitle>
          <DialogDescription>
            Abra o WhatsApp no celular do número que atende pelo CRM → Aparelhos
            conectados → Conectar aparelho, e escaneie o QR code abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-2">
          {carregando ? (
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          ) : erro ? (
            <>
              <p className="text-center text-sm text-destructive">{erro}</p>
              <Button variant="outline" size="sm" onClick={iniciar} className="gap-2">
                <RefreshCw className="size-4" />
                Tentar novamente
              </Button>
            </>
          ) : qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qr}
              alt="QR code de conexão do WhatsApp"
              className="size-56 rounded-md border border-border"
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { createContext, useContext } from "react";

export interface UsuarioAtual {
  nome: string;
  email: string;
}

const UsuarioContext = createContext<UsuarioAtual | null>(null);

export function UsuarioProvider({
  usuario,
  children,
}: {
  usuario: UsuarioAtual;
  children: React.ReactNode;
}) {
  return (
    <UsuarioContext.Provider value={usuario}>
      {children}
    </UsuarioContext.Provider>
  );
}

export function useUsuario(): UsuarioAtual {
  const ctx = useContext(UsuarioContext);
  if (!ctx) {
    throw new Error("useUsuario deve ser usado dentro de <UsuarioProvider>.");
  }
  return ctx;
}

/**
 * Cria um usuário de acesso ao CRM direto no Supabase Auth (service_role).
 * Serve para criar o PRIMEIRO acesso (bootstrap) ou como quebra-galho se o
 * admin se trancar para fora. Depois disso, gerencie tudo em Configurações → Equipe.
 *
 * Uso:
 *   node --env-file=.env.local scripts/criar-usuario.mjs <email> <senha> ["Nome"]
 * ou:
 *   npm run criar-usuario -- <email> <senha> ["Nome"]
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Fallback: se as envs não vieram (sem --env-file), lê o .env.local na mão.
function carregarEnvLocal() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const conteudo = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const linha of conteudo.split("\n")) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // sem .env.local — segue com o que estiver no ambiente
  }
}

carregarEnvLocal();

const [email, senha, nome] = process.argv.slice(2);
const url = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !senha) {
  console.error(
    'Uso: node --env-file=.env.local scripts/criar-usuario.mjs <email> <senha> ["Nome"]'
  );
  process.exit(1);
}
if (!url || !serviceRole) {
  console.error(
    "Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY. Use --env-file=.env.local ou defina no ambiente."
  );
  process.exit(1);
}
if (senha.length < 8) {
  console.error("A senha precisa ter ao menos 8 caracteres.");
  process.exit(1);
}

const supabase = createClient(url, serviceRole, {
  auth: { persistSession: false },
});

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password: senha,
  email_confirm: true,
  user_metadata: { nome: nome || email },
});

if (error) {
  console.error("Erro ao criar usuário:", error.message);
  process.exit(1);
}

console.log(`✓ Acesso criado: ${data.user.email} (id ${data.user.id})`);

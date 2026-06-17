"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/app/actions/auth";

const initialState = { error: "" };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await login(formData);
      return result ?? initialState;
    },
    initialState
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">💧</div>
          <h1 className="text-2xl font-bold text-[#0f172a]">Water Rats</h1>
          <p className="text-sm text-[#64748b] mt-1">Quem bebe mais água hoje?</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-[#0f172a] mb-1">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              required
              className="w-full h-12 px-4 rounded-xl border border-[#e2e8f0] text-[#0f172a] text-base focus:outline-none focus:border-[#0891b2] focus:ring-2 focus:ring-[#0891b2]/20"
              placeholder="seu_username"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#0f172a] mb-1">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full h-12 px-4 rounded-xl border border-[#e2e8f0] text-[#0f172a] text-base focus:outline-none focus:border-[#0891b2] focus:ring-2 focus:ring-[#0891b2]/20"
              placeholder="••••••••"
            />
          </div>

          {state.error && (
            <p className="text-sm text-[#ef4444] text-center">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full h-12 bg-[#0891b2] hover:bg-[#0e7490] text-white font-semibold rounded-xl text-base transition-colors disabled:opacity-60 mt-2"
          >
            {pending ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm text-[#64748b] mt-6">
          Novo por aqui?{" "}
          <Link href="/register" className="text-[#0891b2] font-medium">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}

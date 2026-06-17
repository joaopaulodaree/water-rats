"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const username = (formData.get("username") as string).trim().toLowerCase();
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email: `${username}@waterrats.app`,
    password,
  });

  if (error) {
    return { error: "Usuário ou senha incorretos." };
  }

  redirect("/");
}

export async function register(formData: FormData) {
  const supabase = await createClient();
  const username = (formData.get("username") as string).trim().toLowerCase();
  const password = formData.get("password") as string;
  const displayName = (formData.get("display_name") as string).trim();

  if (username.length < 3) {
    return { error: "Username deve ter pelo menos 3 caracteres." };
  }
  if (password.length < 6) {
    return { error: "Senha deve ter pelo menos 6 caracteres." };
  }
  if (!displayName) {
    return { error: "Nome é obrigatório." };
  }

  const { error } = await supabase.auth.signUp({
    email: `${username}@waterrats.app`,
    password,
    options: {
      data: { display_name: displayName },
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: "Username já em uso. Escolha outro." };
    }
    return { error: error.message };
  }

  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

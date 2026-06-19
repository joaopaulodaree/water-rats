import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function revalidateAchievements() {
  console.log("🔍 Buscando todos os usuários...");

  // Get all users
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

  if (usersError) {
    console.error("❌ Erro ao buscar usuários:", usersError);
    return;
  }

  console.log(`📊 Encontrados ${users.users.length} usuários`);

  let successCount = 0;
  let errorCount = 0;

  for (const user of users.users) {
    try {
      console.log(`\n⏳ Processando ${user.email}...`);

      // Get any water log from this user to use as reference
      const { data: logs } = await supabase
        .from("water_logs")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      const logId = logs?.[0]?.id || "00000000-0000-0000-0000-000000000000";

      // Call check_achievements for this user
      const { data: newAchievements, error: checkError } = await supabase.rpc(
        "check_achievements",
        {
          p_user_id: user.id,
          p_log_id: logId,
        }
      );

      if (checkError) {
        console.error(`  ❌ Erro ao validar achievements:`, checkError.message);
        errorCount++;
        continue;
      }

      if (newAchievements && newAchievements.length > 0) {
        console.log(`  ✅ ${newAchievements.length} achievement(s) adicionado(s)`);
      } else {
        console.log(`  ℹ️  Nenhum novo achievement`);
      }

      successCount++;
    } catch (err) {
      console.error(`  ❌ Exceção:`, err);
      errorCount++;
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`✅ Processados com sucesso: ${successCount}`);
  console.log(`❌ Erros: ${errorCount}`);
  console.log(`${"=".repeat(50)}`);
}

revalidateAchievements().catch(console.error);

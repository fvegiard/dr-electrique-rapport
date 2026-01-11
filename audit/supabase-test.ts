import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testSupabase() {
  console.log("\n\x1b[36m═══════════════════════════════════════════════════════════\x1b[0m");
  console.log("\x1b[36m   TEST DIRECT SUPABASE\x1b[0m");
  console.log("\x1b[36m═══════════════════════════════════════════════════════════\x1b[0m\n");

  const projectRoot = path.resolve(__dirname, "..");
  const indexPath = path.join(projectRoot, "index.html");
  const content = fs.readFileSync(indexPath, "utf-8");

  const urlMatch = content.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/);
  const keyMatch = content.match(/SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/);

  if (!urlMatch || !keyMatch) {
    console.log("\x1b[31m✗ Configuration Supabase non trouvée\x1b[0m");
    return;
  }

  const url = urlMatch[1];
  const key = keyMatch[1];

  console.log(`URL: ${url}`);
  console.log(`Key: ${key.substring(0, 20)}...`);

  // Test with curl-like headers
  try {
    const response = await fetch(`${url}/rest/v1/rapports?select=id,date,redacteur,projet&limit=5`, {
      method: "GET",
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
    });

    console.log(`\nHTTP Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log(`\x1b[32m✓ Connexion réussie!\x1b[0m`);
      console.log(`\nRapports trouvés: ${(data as unknown[]).length}`);

      for (const r of data as {id: string; date: string; redacteur: string; projet: string}[]) {
        console.log(`  - ${r.date} | ${r.redacteur} | ${r.projet}`);
      }
    } else {
      const text = await response.text();
      console.log(`\x1b[31m✗ Erreur: ${text}\x1b[0m`);
    }
  } catch (err) {
    console.log(`\x1b[31m✗ Erreur réseau: ${err}\x1b[0m`);
  }
}

testSupabase().catch(console.error);

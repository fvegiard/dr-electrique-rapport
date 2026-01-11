import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Anthropic();

interface AuditResult {
  category: string;
  status: "OK" | "WARNING" | "ERROR";
  message: string;
  details?: string;
}

const results: AuditResult[] = [];

function log(result: AuditResult) {
  const icon = result.status === "OK" ? "✓" : result.status === "WARNING" ? "⚠" : "✗";
  const color = result.status === "OK" ? "\x1b[32m" : result.status === "WARNING" ? "\x1b[33m" : "\x1b[31m";
  console.log(`${color}${icon}\x1b[0m [${result.category}] ${result.message}`);
  if (result.details) {
    console.log(`   ${result.details}`);
  }
  results.push(result);
}

async function auditFiles() {
  console.log("\n\x1b[36m═══════════════════════════════════════════════════════════\x1b[0m");
  console.log("\x1b[36m   AUDIT DES FICHIERS DU PROJET\x1b[0m");
  console.log("\x1b[36m═══════════════════════════════════════════════════════════\x1b[0m\n");

  const projectRoot = path.resolve(__dirname, "..");

  // Check index.html
  const indexPath = path.join(projectRoot, "index.html");
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, "utf-8");
    log({ category: "FILES", status: "OK", message: "index.html existe", details: `${content.length} caractères` });

    // Check for required components
    const checks = [
      { pattern: /const supabase = /, name: "Supabase client" },
      { pattern: /PhotoUploadGPS/, name: "PhotoUploadGPS component" },
      { pattern: /MaterialScanner/, name: "MaterialScanner component" },
      { pattern: /RapportForm/, name: "RapportForm component" },
      { pattern: /TimePicker/, name: "TimePicker component" },
      { pattern: /DynamicRows/, name: "DynamicRows component" },
      { pattern: /try\s*\{[\s\S]*JSON\.parse/, name: "JSON parsing with try-catch" },
      { pattern: /projetNom/, name: "projetNom field" },
      { pattern: /reunion\.notes/, name: "Reunion notes field" },
    ];

    for (const check of checks) {
      if (check.pattern.test(content)) {
        log({ category: "CODE", status: "OK", message: `${check.name} présent` });
      } else {
        log({ category: "CODE", status: "ERROR", message: `${check.name} MANQUANT` });
      }
    }
  } else {
    log({ category: "FILES", status: "ERROR", message: "index.html INTROUVABLE" });
  }

  // Check dashboard
  const dashboardPath = path.join(projectRoot, "dashboard-a2c15af64b97e73f.html");
  if (fs.existsSync(dashboardPath)) {
    const content = fs.readFileSync(dashboardPath, "utf-8");
    log({ category: "FILES", status: "OK", message: "dashboard existe", details: `${content.length} caractères` });

    // Check photo categories match
    if (content.includes("category === 'GENERALES'") && content.includes("category === 'PROBLEMES'")) {
      log({ category: "CODE", status: "OK", message: "Catégories photos correctes (GENERALES/PROBLEMES)" });
    } else {
      log({ category: "CODE", status: "ERROR", message: "Catégories photos incorrectes" });
    }

    // Check realtime
    if (content.includes("postgres_changes")) {
      log({ category: "CODE", status: "OK", message: "Supabase Realtime configuré" });
    } else {
      log({ category: "CODE", status: "WARNING", message: "Supabase Realtime non détecté" });
    }
  } else {
    log({ category: "FILES", status: "ERROR", message: "dashboard INTROUVABLE" });
  }
}

async function auditSupabase() {
  console.log("\n\x1b[36m═══════════════════════════════════════════════════════════\x1b[0m");
  console.log("\x1b[36m   AUDIT SUPABASE\x1b[0m");
  console.log("\x1b[36m═══════════════════════════════════════════════════════════\x1b[0m\n");

  const projectRoot = path.resolve(__dirname, "..");
  const indexPath = path.join(projectRoot, "index.html");
  const content = fs.readFileSync(indexPath, "utf-8");

  // Extract Supabase URL
  const urlMatch = content.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/);
  const keyMatch = content.match(/SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/);

  if (urlMatch && keyMatch) {
    const url = urlMatch[1];
    const key = keyMatch[1];

    log({ category: "SUPABASE", status: "OK", message: "Configuration trouvée", details: url });

    // Test connection
    try {
      const response = await fetch(`${url}/rest/v1/rapports?select=count`, {
        headers: {
          "apikey": key,
          "Authorization": `Bearer ${key}`,
        },
      });

      if (response.ok) {
        log({ category: "SUPABASE", status: "OK", message: "Connexion réussie" });

        // Check tables
        const tablesResponse = await fetch(`${url}/rest/v1/`, {
          headers: {
            "apikey": key,
            "Authorization": `Bearer ${key}`,
          },
        });

        if (tablesResponse.ok) {
          const tables = await tablesResponse.json();
          log({ category: "SUPABASE", status: "OK", message: "Tables accessibles", details: JSON.stringify(Object.keys(tables || {})) });
        }

        // Count rapports
        const countResponse = await fetch(`${url}/rest/v1/rapports?select=*`, {
          headers: {
            "apikey": key,
            "Authorization": `Bearer ${key}`,
          },
        });

        if (countResponse.ok) {
          const rapports = await countResponse.json() as unknown[];
          log({ category: "SUPABASE", status: "OK", message: `${rapports.length} rapports dans la base` });
        }

        // Count photos
        const photosResponse = await fetch(`${url}/rest/v1/photos?select=*`, {
          headers: {
            "apikey": key,
            "Authorization": `Bearer ${key}`,
          },
        });

        if (photosResponse.ok) {
          const photos = await photosResponse.json() as unknown[];
          log({ category: "SUPABASE", status: "OK", message: `${photos.length} photos dans la base` });
        }

      } else {
        log({ category: "SUPABASE", status: "ERROR", message: "Connexion échouée", details: `HTTP ${response.status}` });
      }
    } catch (err) {
      log({ category: "SUPABASE", status: "ERROR", message: "Erreur de connexion", details: String(err) });
    }
  } else {
    log({ category: "SUPABASE", status: "ERROR", message: "Configuration Supabase non trouvée" });
  }
}

async function auditWithClaude() {
  console.log("\n\x1b[36m═══════════════════════════════════════════════════════════\x1b[0m");
  console.log("\x1b[36m   AUDIT PAR CLAUDE (Agent SDK)\x1b[0m");
  console.log("\x1b[36m═══════════════════════════════════════════════════════════\x1b[0m\n");

  const projectRoot = path.resolve(__dirname, "..");
  const indexContent = fs.readFileSync(path.join(projectRoot, "index.html"), "utf-8");
  const dashboardContent = fs.readFileSync(path.join(projectRoot, "dashboard-a2c15af64b97e73f.html"), "utf-8");

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: `Tu es un auditeur de code professionnel. Analyse ces deux fichiers et donne un rapport STRICT avec:
1. Erreurs critiques (bugs, crashes potentiels)
2. Incohérences entre les fichiers
3. Problèmes de sécurité
4. Fonctionnalités manquantes ou cassées

Format: JSON avec { errors: [], warnings: [], info: [] }

INDEX.HTML (extrait des parties critiques):
${indexContent.substring(0, 15000)}

DASHBOARD.HTML (extrait):
${dashboardContent.substring(0, 10000)}`
        }
      ]
    });

    const textContent = response.content.find(c => c.type === "text");
    if (textContent && textContent.type === "text") {
      console.log("\x1b[35mAnalyse Claude:\x1b[0m");
      console.log(textContent.text);

      // Try to parse JSON response
      try {
        const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);

          if (analysis.errors) {
            for (const err of analysis.errors) {
              log({ category: "CLAUDE", status: "ERROR", message: err });
            }
          }
          if (analysis.warnings) {
            for (const warn of analysis.warnings) {
              log({ category: "CLAUDE", status: "WARNING", message: warn });
            }
          }
          if (analysis.info) {
            for (const info of analysis.info) {
              log({ category: "CLAUDE", status: "OK", message: info });
            }
          }
        }
      } catch {
        // JSON parsing failed, that's ok
      }
    }

    log({ category: "CLAUDE", status: "OK", message: "Audit Claude complété" });
  } catch (err) {
    log({ category: "CLAUDE", status: "ERROR", message: "Erreur API Claude", details: String(err) });
  }
}

async function generateReport() {
  console.log("\n\x1b[36m═══════════════════════════════════════════════════════════\x1b[0m");
  console.log("\x1b[36m   RAPPORT FINAL\x1b[0m");
  console.log("\x1b[36m═══════════════════════════════════════════════════════════\x1b[0m\n");

  const errors = results.filter(r => r.status === "ERROR");
  const warnings = results.filter(r => r.status === "WARNING");
  const ok = results.filter(r => r.status === "OK");

  console.log(`\x1b[32m✓ Succès: ${ok.length}\x1b[0m`);
  console.log(`\x1b[33m⚠ Avertissements: ${warnings.length}\x1b[0m`);
  console.log(`\x1b[31m✗ Erreurs: ${errors.length}\x1b[0m`);

  if (errors.length === 0) {
    console.log("\n\x1b[42m\x1b[30m PROJET PRÊT POUR PRODUCTION \x1b[0m");
  } else {
    console.log("\n\x1b[41m\x1b[37m CORRECTIONS REQUISES \x1b[0m");
    for (const err of errors) {
      console.log(`  - ${err.message}`);
    }
  }
}

async function main() {
  console.log("\x1b[36m");
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║     DR ÉLECTRIQUE - AUDIT COMPLET DE L'ENVIRONNEMENT     ║");
  console.log("║                    Agent SDK TypeScript                   ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");
  console.log("\x1b[0m");

  await auditFiles();
  await auditSupabase();
  await auditWithClaude();
  await generateReport();
}

main().catch(console.error);

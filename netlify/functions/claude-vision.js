// Netlify Function - Proxy sécurisé pour Claude Vision API
// La clé API est stockée dans les variables d'environnement Netlify

export async function handler(event) {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  // Handle preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "API key not configured" })
    };
  }

  try {
    const { imageData, mediaType, materiaux } = JSON.parse(event.body);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: imageData }
            },
            {
              type: "text",
              text: `Analyse cette photo de matériel électrique. Identifie le matériel et estime la quantité visible.

Réponds UNIQUEMENT en JSON valide, sans markdown:
{"item": "nom du matériel électrique", "quantite": "nombre estimé", "unite": "unité|pi|m|rouleau|boîte", "confidence": 0.85}

Matériaux connus: ${materiaux}

Si tu ne reconnais pas de matériel électrique, réponds: {"item": "Non identifié", "quantite": "1", "unite": "unité", "confidence": 0.0}`
            }
          ]
        }]
      })
    });

    const data = await response.json();

    return {
      statusCode: response.ok ? 200 : response.status,
      headers,
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
}

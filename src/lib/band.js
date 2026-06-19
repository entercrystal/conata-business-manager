const BAND_API_KEY = import.meta.env.VITE_BAND_API_KEY;
const BAND_API_URL = import.meta.env.VITE_BAND_API_URL || "/api/band";

export async function invokeBand(prompt, options = {}) {
  if (!BAND_API_KEY) {
    throw new Error("Missing VITE_BAND_API_KEY environment variable. Set it in .env or your build environment.");
  }

  const payload = {
    model: options.model || "band-agent",
    input: prompt,
    max_tokens: options.max_tokens ?? 800,
    temperature: options.temperature ?? 0.5,
    metadata: options.metadata ?? {},
  };

  const response = await fetch(BAND_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      Authorization: `Bearer ${BAND_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMessage = data?.error?.message || data?.message || JSON.stringify(data);
    throw new Error(`Band API error: ${errorMessage}`);
  }

  const output = data.output || data.text || data.response || data.result || data.message;
  if (typeof output === "string") {
    return output;
  }
  if (output && typeof output === "object") {
    return JSON.stringify(output);
  }

  return JSON.stringify(data);
}

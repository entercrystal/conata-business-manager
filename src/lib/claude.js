const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY;
const CLAUDE_MODEL = import.meta.env.VITE_CLAUDE_MODEL || "claude-sonnet-4-6";
const CLAUDE_API_URL = import.meta.env.VITE_CLAUDE_API_URL || "/api/claude";

export async function invokeClaude(prompt, options = {}) {
  if (!CLAUDE_API_KEY) {
    throw new Error("Missing VITE_CLAUDE_API_KEY environment variable. Set it in .env or your build environment.");
  }

  const { max_tokens_to_sample, ...restOptions } = options;
  const hasTemperature = options.temperature !== undefined;
  const hasTopP = options.top_p !== undefined;

  const payload = {
    model: options.model || CLAUDE_MODEL,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens: options.max_tokens ?? max_tokens_to_sample ?? 1000,
    ...(hasTemperature || !hasTopP ? { temperature: options.temperature ?? 0.7 } : {}),
    top_k: options.top_k ?? 0,
    ...(hasTopP && !hasTemperature ? { top_p: options.top_p } : {}),
    stop_sequences: options.stop_sequences ?? ["\n\nHuman:"],
    ...restOptions,
  };

  const response = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-API-Key": CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMessage = data?.error?.message || data?.message || JSON.stringify(data);
    throw new Error(`Claude API error: ${errorMessage}`);
  }

  const normalizeContent = (content) => {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content
        .map((item) => {
          if (typeof item === "string") return item;
          if (typeof item?.text === "string") return item.text;
          if (typeof item?.content === "string") return item.content;
          if (Array.isArray(item?.content)) {
            return item.content
              .map((inner) => typeof inner === "string" ? inner : inner?.text || "")
              .join("");
          }
          return "";
        })
        .join("");
    }

    if (content && typeof content === "object") {
      return normalizeContent(content.content ?? content.text ?? content.body ?? "");
    }

    return "";
  };

  const candidates = [
    data?.content,
    data?.completion,
    data?.completion?.content,
    data?.message?.content,
    data?.response?.content,
    data?.output_text,
  ];

  for (const candidate of candidates) {
    const text = normalizeContent(candidate).trim();
    if (text) return text;
  }

  return JSON.stringify(data);
}

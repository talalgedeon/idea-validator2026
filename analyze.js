exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API key not configured" }),
    };
  }

  try {
    const { idea } = JSON.parse(event.body);

    if (!idea || !idea.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No idea provided" }),
      };
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: `You are a seasoned startup analyst and VC scout. Analyze this startup idea and return ONLY valid JSON (no markdown, no backticks, no explanation outside the JSON).

Startup Idea: "${idea.trim()}"

Return this exact JSON structure:
{
  "scores": { "market": <0-100>, "competition": <0-100>, "timing": <0-100>, "feasibility": <0-100> },
  "overall": <weighted average 0-100>,
  "summary": "<2 sentence executive summary>",
  "strengths": [{"title": "<2-3 word title>", "detail": "<1 sentence professional explanation>"}, {"title": "<2-3 word title>", "detail": "<1 sentence professional explanation>"}, {"title": "<2-3 word title>", "detail": "<1 sentence professional explanation>"}],
  "risks": [{"title": "<2-3 word title>", "detail": "<1 sentence professional explanation>"}, {"title": "<2-3 word title>", "detail": "<1 sentence professional explanation>"}, {"title": "<2-3 word title>", "detail": "<1 sentence professional explanation>"}],
  "nextSteps": ["<actionable step 1>", "<actionable step 2>", "<actionable step 3>"],
  "comparable": "<name one real startup/company this is most similar to and why, in one sentence>"
}

Be calibrated: most ideas should score 40-75. Only truly exceptional ideas get 80+. Write like a senior VC partner in an investment memo — precise, data-informed language. No hype or generic statements. Reference specific market dynamics, unit economics concerns, or technical barriers where relevant. Consider current 2025 market conditions.`,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error?.message || "API error" }),
      };
    }

    const text = data.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Analysis failed: " + err.message }),
    };
  }
};

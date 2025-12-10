import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 8080;

// For quick testing ONLY. In real deploy, remove this line
// and use: const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_KEY = "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";

app.use(cors());
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = req.body?.message;
    if (!userMessage) {
      return res.status(400).json({
        ok: false,
        errorType: "INPUT",
        errorMessage: "Request JSON must include a 'message' string"
      });
    }

    const systemPrompt =
      "You are the 'ErgoMatrix Local Coach', a narrow FAQ and posture assistant. " +
      "You ONLY answer questions about ErgoMatrix, the Posture Pro system, Eye-Q Sensor, Mesh-Up, posture tips for desk workers, " +
      "and this website. If the question is outside this scope, say you can only help with those topics.";

    const body = {
      model: "openai/gpt-oss-20b:free",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      reasoning: { enabled: true }
    };

    const apiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://your-frontend-domain.com",
        "X-Title": "ErgoMatrix Local Coach"
      },
      body: JSON.stringify(body)
    });

    const text = await apiRes.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    if (!apiRes.ok) {
      return res.status(apiRes.status).json({
        ok: false,
        errorType: "OPENROUTER_HTTP",
        status: apiRes.status,
        statusText: apiRes.statusText,
        errorMessage:
          json?.error?.message ||
          text ||
          "OpenRouter returned a non-2xx status code"
      });
    }

    const content = json?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return res.status(500).json({
        ok: false,
        errorType: "PARSE",
        errorMessage: "No 'choices[0].message.content' in OpenRouter response"
      });
    }

    return res.json({
      ok: true,
      reply: content
    });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({
      ok: false,
      errorType: "SERVER",
      errorMessage: err.message || "Unexpected server error"
    });
  }
});

app.get("/", (req, res) => {
  res.json({ ok: true, message: "ErgoMatrix backend is running." });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

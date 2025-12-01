require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT || 3000;

// Basic safety check
if (!GEMINI_API_KEY) {
  console.error("Missing GEMINI_API_KEY in .env");
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// Serve static frontend files from /public
app.use(express.static("public"));

// Helper: build system prompt to restrict domain
function buildPrompt(userMessage) {
  return `
You are the official AI posture coach for ErgoMatrix, a company that makes the Eye-Q Sensor, Mesh-Up chair cover, and the Posture Pro system (Eye-Q + Mesh-Up). 
Only answer questions about:
- Posture
- Ergonomics
- Pain relief for desk workers
- How to set up and use ErgoMatrix products (Eye-Q Sensor, Mesh-Up, Posture Pro)
- Future vision: SaaS posture analytics and smart furniture integration

Rules:
- If the user asks about anything outside posture, ergonomics, pain relief, or ErgoMatrix, reply:
  "I can only help with ErgoMatrix, posture, ergonomics, and pain relief for desk workers."
- If the user asks who made you, who created you, or who made this website, reply:
  "Tanuj Sharma and Sparsh Jain created me and this website."
- Keep answers short, practical, and easy to follow.
- If the user mentions pain (neck, back, shoulders, etc.), give ergonomic advice, posture guidance, and micro-break suggestions only. Do NOT give medical diagnoses or drug recommendations.

User message:
${userMessage}
`;
}

// Gemini chat endpoint
app.post("/api/ergo-chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing 'message' string in body." });
    }

    // Small front-end safety: ignore obviously unrelated stuff
    const lower = message.toLowerCase();
    if (
      !(
        lower.includes("posture") ||
        lower.includes("back") ||
        lower.includes("neck") ||
        lower.includes("pain") ||
        lower.includes("chair") ||
        lower.includes("desk") ||
        lower.includes("ergonomic") ||
        lower.includes("ergonomics") ||
        lower.includes("eye-q") ||
        lower.includes("eye q") ||
        lower.includes("mesh-up") ||
        lower.includes("mesh up") ||
        lower.includes("posture pro") ||
        lower.includes("ergomatrix") ||
        lower.includes("who made you") ||
        lower.includes("who created you") ||
        lower.includes("who made this website")
      )
    ) {
      return res.json({
        reply:
          "I can only help with ErgoMatrix, posture, ergonomics, and pain relief for desk workers.",
      });
    }

    // Special handling for creator question
    if (
      lower.includes("who made you") ||
      lower.includes("who created you") ||
      lower.includes("who made this website")
    ) {
      return res.json({
        reply: "Tanuj Sharma and Sparsh Jain created me and this website.",
      });
    }

    const systemPrompt = buildPrompt(message);

    // Call Gemini API (text model)
    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
        encodeURIComponent(GEMINI_API_KEY),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: systemPrompt }],
            },
          ],
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", geminiRes.status, errText);
      return res.status(500).json({
        error: "Gemini API error",
        detail: errText,
      });
    }

    const data = await geminiRes.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I could not generate a response right now. Please try again.";

    res.json({ reply: text });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`ErgoMatrix server listening on http://localhost:${PORT}`);
});

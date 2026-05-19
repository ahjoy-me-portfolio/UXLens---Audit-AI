import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import * as admin from "firebase-admin";
import fs from "fs";

dotenv.config();

export const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

let db: admin.firestore.Firestore | null = null;

// Helper to get fresh security config (Admin SDK bypasses rules)
async function getSecurityConfig() {
  if (!db) return null;
  try {
    const d = await db.collection('security').doc('config').get();
    if (d.exists) return d.data();
  } catch (e) {
    console.error("Error fetching security config via Admin SDK:", e);
  }
  return null;
}

// Basic Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Proxy AI calls
app.post("/api/analyze", async (req, res) => {
  const { image, designType, goal } = req.body;
  if (!image) return res.status(400).json({ error: "Image required" });

  let retries = 3;
  const backoff = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  while (retries > 0) {
    try {
      const secConfig = await getSecurityConfig();
      
      // Priority: Env Var > Firestore Config
      const apiKey = process.env.GEMINI_API_KEY || (secConfig as any)?.geminiApiKey;
      
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is missing. Please set it in AI Studio Secrets or Admin Security tab." });
      }

      const modelName = (secConfig as any)?.modelName || "gemini-3-flash-preview";
      const temperature = (secConfig as any)?.temperature ?? 0.4;

      const ai = new GoogleGenAI({ 
        apiKey: apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const base64Data = image.split(",")[1] || image;
      const mimeType = image.split(";")[0]?.split(":")[1] || "image/png";

      const prompt = `Analyze this UI/UX design:
        Category: ${designType}
        Goal: ${goal}
        Markers: ---ENGLISH_VERSION--- and ---BENGALI_VERSION---
        
        Format your response with clear sections using the markers above.
        English version first, then Bengali.`;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          { 
            parts: [
              { text: prompt },
              { inlineData: { data: base64Data, mimeType } }
            ]
          }
        ],
        config: {
          temperature: temperature,
          maxOutputTokens: (secConfig as any)?.maxTokens || 2048,
        } as any
      });

      return res.json({ result: response.text });
    } catch (error: any) {
      console.error(`AI Analysis Error (Retries left: ${retries - 1}):`, error);
      
      // Check for 503 UNAVAILABLE or 429 RATE_LIMIT
      const isTransient = error.message?.includes('503') || 
                        error.message?.includes('UNAVAILABLE') || 
                        error.message?.includes('429') ||
                        error.message?.includes('rate limit');

      if (isTransient && retries > 1) {
        retries--;
        await backoff(2000 * (3 - retries)); // Exponential backoff
        continue;
      }
      
      return res.status(500).json({ error: error.message || "Failed to analyze image" });
    }
  }
});

async function bootstrap() {
  console.log("Bootstrapping server...");
  
  try {
    // Load Firebase Config
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      
      // Initialize Firebase Admin
      if (!admin.apps.length) {
        admin.initializeApp({
          projectId: firebaseConfig.projectId,
        });
      }
      db = admin.firestore();
      console.log("Firebase Admin initialized successfully.");
    } else {
      console.warn("firebase-applet-config.json not found, continuing without Firestore config.");
    }
  } catch (err) {
    console.error("Failed to initialize Firebase Admin:", err);
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("Starting Vite in middleware mode...");
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware attached.");
    } catch (err) {
      console.error("Vite server failed to start:", err);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

bootstrap();

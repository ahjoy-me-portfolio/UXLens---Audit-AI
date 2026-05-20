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

// Helper to get fresh security config (Admin SDK bypasses rules) and auto-seed if empty
async function getSecurityConfig() {
  if (!db) return null;
  try {
    const docRef = db.collection('security').doc('config');
    const d = await docRef.get();
    if (d.exists) {
      const data = d.data();
      // If geminiApiKey doesn't exist in Firestore, but is available in the environment, auto-seed it!
      if (!data?.geminiApiKey && process.env.GEMINI_API_KEY) {
        console.log("Auto-seeding default GEMINI_API_KEY from server environment into Firestore.");
        await docRef.set({
          geminiApiKey: process.env.GEMINI_API_KEY,
          modelName: data?.modelName || 'gemini-3.5-flash',
          temperature: data?.temperature ?? 0.4,
          maxTokens: data?.maxTokens || 2048,
          adminPin: data?.adminPin || '1234'
        }, { merge: true });
        return {
          ...data,
          geminiApiKey: process.env.GEMINI_API_KEY
        };
      }
      return data;
    } else if (process.env.GEMINI_API_KEY) {
      console.log("Creating default security config in Firestore with master environment key.");
      const defaultSec = {
        geminiApiKey: process.env.GEMINI_API_KEY,
        modelName: 'gemini-3.5-flash',
        temperature: 0.4,
        maxTokens: 2048,
        adminPin: '1234'
      };
      await docRef.set(defaultSec);
      return defaultSec;
    }
  } catch (e) {
    console.error("Error fetching/seeding security config via Admin SDK:", e);
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
      
      // Priority: Firestore Config (Admin custom) > Env Var (Developer built-in)
      const apiKey = (secConfig as any)?.geminiApiKey || process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is missing. Please set it in AI Studio Secrets or Admin Security tab." });
      }

      let modelName = (secConfig as any)?.modelName || "gemini-3.5-flash";
      if (modelName === "gemini-3-flash-preview" || modelName === "gemini-3-flash") {
        modelName = "gemini-3.5-flash";
      }
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
    let firebaseConfig: any = null;
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    } else {
      // Fallback details to make it 100% portable for Netlify / other cloud targets
      firebaseConfig = {
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "graphic-antler-g3n78"
      };
    }
    
    // Initialize Firebase Admin
    if (!admin.apps.length) {
      const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (serviceAccountStr) {
        try {
          const serviceAccount = JSON.parse(serviceAccountStr);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: firebaseConfig.projectId
          });
          console.log("Firebase Admin initialized via service account environment variable.");
        } catch (e) {
          console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable:", e);
          admin.initializeApp({
            projectId: firebaseConfig.projectId,
          });
        }
      } else {
        admin.initializeApp({
          projectId: firebaseConfig.projectId,
        });
        console.log("Firebase Admin initialized via default ADC or project ID:", firebaseConfig.projectId);
      }
    }
    db = admin.firestore();
    console.log("Firebase Firestore database initialized successfully.");
    
    // Proactively call getSecurityConfig to check and auto-seed the master API key and default admin settings on boot
    setTimeout(async () => {
      try {
        console.log("Proactively checking / seeding Firestore security config...");
        await getSecurityConfig();
      } catch (e) {
        console.error("Proactive seeding failed:", e);
      }
    }, 1000);
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

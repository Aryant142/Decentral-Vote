import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Mock KYC Verification Endpoint
  app.post("/api/kyc/verify", (req, res) => {
    const { userId, aadhaarId } = req.body;
    // In a real app, this would integrate with a government API or manual review
    console.log(`Verifying KYC for user ${userId} with Aadhaar ${aadhaarId}`);
    
    // Simulate processing
    setTimeout(() => {
      res.json({ 
        success: true, 
        message: "KYC verification initiated",
        status: "pending" 
      });
    }, 1000);
  });

  // Generate DID Endpoint
  app.post("/api/did/generate", (req, res) => {
    const { userId } = req.body;
    // Generate a mock DID
    const did = `did:ethr:${userId}:${Math.random().toString(36).substring(7)}`;
    res.json({ success: true, did });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Error starting server:", err);
});

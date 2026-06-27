import "dotenv/config";
import express from "express";
import cors from "cors";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { apiRouter, notFound } from "./routes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT ?? "3001", 10);

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use("/api", apiRouter);

const webDist = join(__dirname, "../../web/dist");
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(join(webDist, "index.html"));
  });
}

app.use(notFound);

app.listen(PORT, () => {
  console.log(`\n🚀 Angelina Tester app running at http://localhost:${PORT}`);
  if (!process.env.OPENAI_API_KEY) {
    console.log("   ⚠  Set OPENAI_API_KEY in .env or provide it in the UI\n");
  }
});

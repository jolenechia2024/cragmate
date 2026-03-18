import type { VercelRequest, VercelResponse } from "@vercel/node";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import app from "../src/app";

// Load repo-root .env for DATABASE_URL, etc.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../../.env"), override: true });

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}


import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

import connectDB from "./config/db.js";
import { seedInitialMedicines } from "./config/seed.js";
import medicineRoutes from "./routes/medicineRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import prescriptionRoutes from "./routes/prescriptionRoutes.js";
import ngoRequestRoutes from "./routes/ngoRequestRoutes.js";
import cepProofRoutes from "./routes/cepProofRoutes.js";

const app = express();

connectDB().then(() => {
  seedInitialMedicines();
});

app.use(cors());
// Increase body size limit to 10MB to support base64-encoded packaging photo uploads
// Default 100kb limit caused 413 Payload Too Large on the Donate Medicine form
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.get("/", (req, res) => {
  res.send("MEDISAVE Backend Running...");
});

app.use("/api/auth", authRoutes);
app.use("/api/medicines", medicineRoutes);
// Commercial marketplace checkout unmounted: MEDISAVE is a 100% free verified community donation platform
// app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/ngo-requests", ngoRequestRoutes);
app.use("/api/cep-proofs", cepProofRoutes);


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
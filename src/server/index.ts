import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import healthRouter from "./routes/health";

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || "4000", 10);

app.use(cors());
app.use(express.json());

// Mount the health router
app.use("/api/health", healthRouter);

app.listen(port, "0.0.0.0", () => {
  console.log(`AI Radar API listening on port ${port}`);
});

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import healthRouter from "./routes/health";
import itemsRouter from "./routes/items";
import sourcesRouter from "./routes/sources";
import runsRouter from "./routes/runs";
import tagsRouter from "./routes/tags";

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || "4000", 10);

app.use(cors());
app.use(express.json());

// Mount the routers
app.use("/api/health", healthRouter);
app.use("/api/items", itemsRouter);
app.use("/api/sources", sourcesRouter);
app.use("/api/runs", runsRouter);
app.use("/api/tags", tagsRouter);

// Global Error Handler Middleware to prevent stack trace leaks
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({
    error: {
      message: "Internal server error"
    }
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`AI Radar API listening on port ${port}`);
});

import { Router } from "express";
import { listSyncRuns } from "../../db/syncRunReadRepository";

const router = Router();

function parsePositiveInt(value: unknown, fallback: number, max: number): number {
  if (value === undefined || value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

router.get("/", (req, res) => {
  try {
    const limit = parsePositiveInt(req.query.limit, 50, 200);
    const offset = Math.max(Number(req.query.offset || 0), 0);

    const result = listSyncRuns({
      status: req.query.status as string,
      sourceId: req.query.sourceId as string,
      limit,
      offset: isNaN(offset) ? 0 : offset,
    });

    res.json({
      runs: result.runs,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    });
  } catch (err) {
    console.error("GET /api/runs failed:", err);
    res.status(500).json({
      error: { message: "Internal server error" }
    });
  }
});

export default router;

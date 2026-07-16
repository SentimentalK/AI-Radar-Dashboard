import { Router } from "express";
import { listItems, listTimelineGroups, getItemById } from "../../db/itemReadRepository";

const router = Router();

function parsePositiveInt(value: unknown, fallback: number, max: number): number {
  if (value === undefined || value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

// Timeline endpoint MUST be defined before the detail ID route
router.get("/timeline", (req, res) => {
  try {
    const days = parsePositiveInt(req.query.days, 7, 90);
    const limitPerDay = parsePositiveInt(req.query.limitPerDay, 50, 200);
    const minRelevance = req.query.minRelevance !== undefined ? Number(req.query.minRelevance) : undefined;

    const groups = listTimelineGroups({
      days,
      limitPerDay,
      sourceType: req.query.sourceType as string,
      category: req.query.category as string,
      recommendedAction: req.query.recommendedAction as string,
      minRelevance: isNaN(Number(minRelevance)) ? undefined : minRelevance,
    });

    res.json({ groups });
  } catch (err) {
    console.error("GET /api/items/timeline failed:", err);
    res.status(500).json({
      error: { message: "Internal server error" }
    });
  }
});

router.get("/:id", (req, res) => {
  try {
    const item = getItemById(req.params.id);
    if (!item) {
      return res.status(404).json({
        error: { message: "Item not found" }
      });
    }
    res.json({ item });
  } catch (err) {
    console.error(`GET /api/items/${req.params.id} failed:`, err);
    res.status(500).json({
      error: { message: "Internal server error" }
    });
  }
});

router.get("/", (req, res) => {
  try {
    const limit = parsePositiveInt(req.query.limit, 50, 200);
    const offset = Math.max(Number(req.query.offset || 0), 0);
    const minRelevance = req.query.minRelevance !== undefined ? Number(req.query.minRelevance) : undefined;

    const result = listItems({
      sourceType: req.query.sourceType as string,
      sourceId: req.query.sourceId as string,
      category: req.query.category as string,
      recommendedAction: req.query.recommendedAction as string,
      minRelevance: isNaN(Number(minRelevance)) ? undefined : minRelevance,
      q: req.query.q as string,
      limit,
      offset: isNaN(offset) ? 0 : offset,
    });

    res.json({
      items: result.items,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    });
  } catch (err) {
    console.error("GET /api/items failed:", err);
    res.status(500).json({
      error: { message: "Internal server error" }
    });
  }
});

export default router;

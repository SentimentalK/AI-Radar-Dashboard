import { Router } from "express";
import { listTags } from "../../db/tagReadRepository";

const router = Router();

router.get("/", (req, res) => {
  try {
    const tags = listTags();
    res.json({ tags });
  } catch (err) {
    console.error("GET /api/tags failed:", err);
    res.status(500).json({
      error: { message: "Internal server error" }
    });
  }
});

export default router;

import { Router } from "express";
import { listSources } from "../../db/sourceReadRepository";

const router = Router();

router.get("/", (req, res) => {
  try {
    let enabled: boolean | undefined = undefined;
    if (req.query.enabled === "true") {
      enabled = true;
    } else if (req.query.enabled === "false") {
      enabled = false;
    }

    const sources = listSources({ enabled });
    res.json({ sources });
  } catch (err) {
    console.error("GET /api/sources failed:", err);
    res.status(500).json({
      error: { message: "Internal server error" }
    });
  }
});

export default router;

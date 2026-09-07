import type { Request, Response } from "express";
import { dashboardService } from "../services/dashboardService.js";

export const dashboardController = {
  async get(req: Request, res: Response): Promise<void> {
    const data = await dashboardService.getDashboard(req.authUser!);
    res.json({ success: true, data });
  },
};

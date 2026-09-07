import { Router } from "express";
import multer from "multer";
import { MAX_UPLOAD_SIZE_BYTES } from "../config/limits.js";
import { analysisController } from "../controllers/analysisController.js";
import { materialController } from "../controllers/materialController.js";
import { analyzeLimiter, uploadLimiter } from "../middleware/rateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ValidationError } from "../utils/errors.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
    if (allowed.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
      return;
    }
    cb(new ValidationError("نوع الملف غير مدعوم.", "UNSUPPORTED_TYPE"));
  },
});

export const materialRoutes = Router();

materialRoutes.post(
  "/upload",
  uploadLimiter,
  upload.single("file"),
  asyncHandler(materialController.upload),
);

materialRoutes.post(
  "/text",
  uploadLimiter,
  asyncHandler(materialController.createFromText),
);

materialRoutes.get("/:materialId/file", asyncHandler(materialController.file));

materialRoutes.get("/:materialId/analysis", asyncHandler(analysisController.get));

materialRoutes.post(
  "/:materialId/analyze",
  analyzeLimiter,
  asyncHandler(analysisController.analyze),
);

materialRoutes.patch(
  "/:materialId/ocr",
  asyncHandler(analysisController.correctOcr),
);

materialRoutes.post(
  "/:materialId/learn",
  asyncHandler(analysisController.startLearning),
);

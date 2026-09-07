import sharp from "sharp";
import { MAX_VISION_IMAGE_PX } from "../../config/analysis.js";

export async function preprocessForOcr(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({ width: 2000, withoutEnlargement: true })
    .grayscale()
    .normalize()
    .png()
    .toBuffer();
}

export async function prepareVisionImage(buffer: Buffer): Promise<{
  mime: "image/jpeg";
  base64: string;
  width: number;
  height: number;
}> {
  const image = sharp(buffer).rotate().resize({
    width: MAX_VISION_IMAGE_PX,
    height: MAX_VISION_IMAGE_PX,
    fit: "inside",
    withoutEnlargement: true,
  });
  const { data, info } = await image.jpeg({ quality: 80 }).toBuffer({ resolveWithObject: true });
  return {
    mime: "image/jpeg",
    base64: data.toString("base64"),
    width: info.width,
    height: info.height,
  };
}

export async function imageStats(buffer: Buffer): Promise<{ width: number; height: number }> {
  const meta = await sharp(buffer).metadata();
  return {
    width: meta.width ?? 0,
    height: meta.height ?? 0,
  };
}

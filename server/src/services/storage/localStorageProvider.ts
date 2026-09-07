import { promises as fs } from "node:fs";
import path from "node:path";
import { storageRoot } from "../../config/database.js";
import type { StorageProvider, StoredObject } from "./types.js";

function resolveSafe(key: string): string {
  const root = storageRoot();
  const normalized = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
  const absolute = path.resolve(root, normalized);
  if (!absolute.startsWith(root)) {
    throw new Error("Invalid storage key");
  }
  return absolute;
}

export class LocalStorageProvider implements StorageProvider {
  async upload(params: {
    key: string;
    buffer: Buffer;
    mimeType: string;
  }): Promise<StoredObject> {
    const filePath = resolveSafe(params.key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, params.buffer);
    return {
      key: params.key,
      size: params.buffer.length,
      mimeType: params.mimeType,
    };
  }

  async delete(key: string): Promise<void> {
    const filePath = resolveSafe(key);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw error;
    }
  }

  getUrl(key: string): string {
    return key;
  }

  async read(key: string): Promise<Buffer> {
    return fs.readFile(resolveSafe(key));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(resolveSafe(key));
      return true;
    } catch {
      return false;
    }
  }
}

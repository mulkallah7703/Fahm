import { env } from "../../config/env.js";
import { AppError } from "../../utils/errors.js";
import { LocalStorageProvider } from "./localStorageProvider.js";
import type { StorageProvider, StoredObject } from "./types.js";

function createProvider(): StorageProvider {
  if (env.storage.provider === "local") {
    return new LocalStorageProvider();
  }
  throw new AppError(
    "STORAGE_UNSUPPORTED",
    "مزود التخزين غير مدعوم في هذه البيئة.",
    500,
  );
}

const provider = createProvider();

export const storageService = {
  upload(params: {
    key: string;
    buffer: Buffer;
    mimeType: string;
  }): Promise<StoredObject> {
    return provider.upload(params);
  },
  delete(key: string): Promise<void> {
    return provider.delete(key);
  },
  getUrl(key: string): string {
    return provider.getUrl(key);
  },
  read(key: string): Promise<Buffer> {
    return provider.read(key);
  },
  exists(key: string): Promise<boolean> {
    return provider.exists(key);
  },
};

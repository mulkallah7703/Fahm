export interface StoredObject {
  key: string;
  size: number;
  mimeType: string;
}

export interface StorageProvider {
  upload(params: {
    key: string;
    buffer: Buffer;
    mimeType: string;
  }): Promise<StoredObject>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
  read(key: string): Promise<Buffer>;
  exists(key: string): Promise<boolean>;
}

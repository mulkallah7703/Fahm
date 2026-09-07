export async function extractPdfFirstPage(buffer: Buffer): Promise<{
  pageCount: number;
  text: string;
}> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    isEvalSupported: false,
    disableFontFace: true,
    disableAutoFetch: true,
    disableStream: true,
  });
  const doc = await task.promise;
  try {
    const pageCount = doc.numPages;
    const page = await doc.getPage(1);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    return { pageCount, text };
  } finally {
    await doc.destroy();
  }
}

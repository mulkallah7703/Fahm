import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../common/Button";
import { Card } from "../common/Card";
import { materialsApi } from "../../services/materialsApi";
import { ApiError } from "../../types";
import { validateClientFile } from "../../utils/fileValidation";
import { CameraModal } from "./CameraModal";

type UploadState = "idle" | "dragging" | "processing" | "success" | "error";

interface Props {
  onUploaded?: () => void;
}

export function UploadCard({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [state, setState] = useState<UploadState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setMessage(null);
    setState("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const applyFile = (next: File) => {
    const invalid = validateClientFile(next);
    if (invalid) {
      setState("error");
      setMessage(invalid);
      return;
    }
    setFile(next);
    setMessage(null);
    setState("idle");
    if (next.type.startsWith("image/")) {
      const url = URL.createObjectURL(next);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const upload = async (next = file) => {
    if (!next) return;
    setState("processing");
    setMessage("جاري تجهيز الصفحة...");
    try {
      const result = await materialsApi.upload(next);
      setState("success");
      setMessage("تم رفع الصفحة بنجاح");
      onUploaded?.();
      window.setTimeout(() => navigate(`/lesson/${result.materialId}/analyze`), 500);
    } catch (error) {
      setState("error");
      setMessage(error instanceof ApiError ? error.message : "تعذر رفع الملف.");
    }
  };

  return (
    <Card
      id="upload-card"
      className={`upload-card ${state === "dragging" ? "dragging" : ""}`}
      aria-label="رفع صفحة الكتاب"
      onDragOver={(event) => {
        event.preventDefault();
        setState("dragging");
      }}
      onDragLeave={() => setState(file ? "idle" : "idle")}
      onDrop={(event) => {
        event.preventDefault();
        const dropped = event.dataTransfer.files[0];
        if (dropped) applyFile(dropped);
      }}
    >
      <div className="upload-icon" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 8.5A3.5 3.5 0 0 1 7.5 5H9l1.2-2h3.6L15 5h1.5A3.5 3.5 0 0 1 20 8.5v8A3.5 3.5 0 0 1 16.5 20h-9A3.5 3.5 0 0 1 4 16.5z" />
          <circle cx="12" cy="13" r="3.2" />
        </svg>
      </div>

      {preview ? (
        <div className="upload-preview">
          <img src={preview} alt="معاينة الملف المحدد" />
          <p>{file?.name}</p>
        </div>
      ) : (
        <>
          <h2>أفلت صورة صفحة الكتاب هنا</h2>
          <p>PNG · JPG · PDF — أو التقط صورة بالكاميرا · OCR + Vision AI</p>
        </>
      )}

      {message ? (
        <p className={state === "error" ? "status-err" : "status-ok"} role="status">
          {message}
        </p>
      ) : null}

      <div className="upload-actions">
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,application/pdf"
          onChange={(event) => {
            const selected = event.target.files?.[0];
            if (selected) applyFile(selected);
          }}
        />
        <Button type="button" onClick={() => inputRef.current?.click()}>
          اختر ملفًا
        </Button>
        <Button variant="ghost" type="button" onClick={() => setCameraOpen(true)}>
          افتح الكاميرا
        </Button>
        {file ? (
          <>
            <Button type="button" onClick={() => void upload()} disabled={state === "processing"}>
              {state === "processing" ? "جاري الرفع..." : "رفع الصفحة"}
            </Button>
            <Button variant="text" type="button" onClick={reset}>
              إزالة
            </Button>
          </>
        ) : null}
      </div>

      <CameraModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(captured) => {
          applyFile(captured);
          void upload(captured);
        }}
      />
    </Card>
  );
}

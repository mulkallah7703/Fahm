import { useState } from "react";
import { Button } from "../common/Button";
import { Card } from "../common/Card";
import { analysisApi } from "../../services/analysisApi";
import { ApiError, type PageAnalysis } from "../../types";

interface Props {
  analysis: PageAnalysis;
  onUpdated: (next: PageAnalysis) => void;
}

export function ExtractedTextCard({ analysis, onUpdated }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(analysis.ocr?.text ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const text = analysis.ocr?.text ?? "";

  const copy = async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
  };

  const speak = () => {
    if (!text || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = analysis.ocr?.language === "en" ? "en-US" : "ar-SA";
    window.speechSynthesis.speak(utterance);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const next = await analysisApi.correctOcr(analysis.material.id, draft);
      onUpdated(next);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذر حفظ التعديل.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="text-card">
      <h2>النص المستخرج</h2>
      {analysis.ocr?.lowConfidence ? (
        <p className="warning">دقة قراءة النص منخفضة. حاول رفع صورة أوضح.</p>
      ) : null}
      {analysis.ocr?.isCorrected ? (
        <p className="muted">تم تعديل النص. النص الأصلي من OCR محفوظ كما هو.</p>
      ) : null}
      {editing ? (
        <textarea className="field" style={{ width: "100%", minHeight: 180 }} value={draft} onChange={(e) => setDraft(e.target.value)} />
      ) : (
        <p className={`extracted-text${expanded ? " expanded" : ""}`}>
          {text || "لم يتم استخراج نص بعد."}
        </p>
      )}
      {error ? <p className="status-err">{error}</p> : null}
      <div className="analysis-actions">
        <Button variant="ghost" type="button" onClick={() => setExpanded((value) => !value)}>
          {expanded ? "طي النص" : "عرض النص الكامل"}
        </Button>
        <Button variant="text" type="button" onClick={() => void copy()} disabled={!text}>
          نسخ
        </Button>
        <Button variant="text" type="button" onClick={speak} disabled={!text}>
          قراءة
        </Button>
        {editing ? (
          <Button type="button" onClick={() => void save()} disabled={saving}>
            حفظ التعديل
          </Button>
        ) : (
          <Button
            variant="text"
            type="button"
            onClick={() => {
              setDraft(text);
              setEditing(true);
            }}
            disabled={!analysis.ocr}
          >
            تعديل النص
          </Button>
        )}
      </div>
    </Card>
  );
}

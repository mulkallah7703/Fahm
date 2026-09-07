import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { materialsApi } from "../../services/materialsApi";
import { ApiError } from "../../types";
import { MAX_TEXT_LENGTH } from "../../utils/fileValidation";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function PasteTextModal({ open, onClose, onCreated }: Props) {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (!text.trim()) {
      setError("أدخل نصاً من الدرس أولاً.");
      return;
    }
    setLoading(true);
    try {
      const result = await materialsApi.createFromText(text);
      onCreated?.();
      onClose();
      setText("");
      navigate(`/lesson/${result.materialId}/analyze`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذر حفظ النص.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="إدخال نص" open={open} onClose={onClose}>
      <div className="field">
        <label htmlFor="paste-text">الصق نصًا من درس أو ملزمة.</label>
        <textarea
          id="paste-text"
          value={text}
          maxLength={MAX_TEXT_LENGTH}
          onChange={(event) => setText(event.target.value)}
        />
      </div>
      {error ? <p className="status-err" role="alert">{error}</p> : null}
      <div className="modal-actions">
        <Button variant="text" type="button" onClick={onClose}>
          إلغاء
        </Button>
        <Button type="button" onClick={() => void submit()} disabled={loading}>
          {loading ? "جاري الحفظ..." : "ابدأ التعلم"}
        </Button>
      </div>
    </Modal>
  );
}

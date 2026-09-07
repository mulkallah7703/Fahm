import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { fileFromDataUrl } from "../../utils/fileValidation";

interface Props {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

function cameraMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError") {
    return "لم نتمكن من الوصول إلى الكاميرا. يرجى السماح باستخدام الكاميرا من إعدادات المتصفح.";
  }
  if (name === "NotFoundError") {
    return "لم يتم العثور على كاميرا متصلة بهذا الجهاز.";
  }
  if (name === "NotReadableError") {
    return "الكاميرا مستخدمة من تطبيق آخر. أغلقه ثم حاول مرة أخرى.";
  }
  if (name === "OverconstrainedError") {
    return "تعذر تشغيل الكاميرا بالإعدادات المطلوبة.";
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return "المتصفح لا يدعم الكاميرا.";
  }
  return "لم يتم السماح باستخدام الكاميرا.";
}

export function CameraModal({ open, onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setSnapshot(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("المتصفح لا يدعم الكاميرا.");
      return;
    }
    setLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setError(cameraMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void startCamera();
    }
    return () => {
      stopStream();
    };
  }, [open, startCamera, stopStream]);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setSnapshot(canvas.toDataURL("image/jpeg", 0.92));
    stopStream();
  };

  const usePhoto = () => {
    if (!snapshot) return;
    onCapture(fileFromDataUrl(snapshot, `fahm-camera-${Date.now()}.jpg`));
    onClose();
  };

  const handleClose = () => {
    stopStream();
    setSnapshot(null);
    onClose();
  };

  return (
    <Modal title="التقاط صورة" open={open} onClose={handleClose}>
      <div className="camera-preview">
        {error ? <p className="status-err" role="alert">{error}</p> : null}
        {loading ? <p>جاري فتح الكاميرا...</p> : null}
        {!snapshot ? (
          <video ref={videoRef} playsInline muted autoPlay aria-label="معاينة الكاميرا" />
        ) : (
          <img src={snapshot} alt="الصورة الملتقطة" />
        )}
      </div>
      <div className="modal-actions">
        <Button variant="text" type="button" onClick={handleClose}>
          إلغاء
        </Button>
        {!snapshot ? (
          <Button type="button" onClick={capture} disabled={Boolean(error) || loading}>
            التقاط
          </Button>
        ) : (
          <>
            <Button variant="ghost" type="button" onClick={() => void startCamera()}>
              إعادة التصوير
            </Button>
            <Button type="button" onClick={usePhoto}>
              استخدام الصورة
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}

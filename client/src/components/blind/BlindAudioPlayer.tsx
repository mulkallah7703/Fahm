import { Button } from "../common/Button";
import { Card } from "../common/Card";
import { inferVoiceGender, type AudioStatus } from "../../services/audio/audioState";

interface Props {
  status: AudioStatus;
  speechRate: number;
  recommendedSpeed: number | null;
  knownDuration: number | null;
  elapsed: number;
  voices: SpeechSynthesisVoice[];
  voiceURI: string | null;
  arabicAvailable: boolean;
  genderSupported: boolean;
  ttsConfigured: boolean;
  progressCurrent: number;
  progressTotal: number;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onReplay: () => void;
  onSpeed: (value: number) => void;
  onVoice: (uri: string) => void;
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function BlindAudioPlayer({
  status,
  speechRate,
  recommendedSpeed,
  knownDuration,
  elapsed,
  voices,
  voiceURI,
  arabicAvailable,
  genderSupported,
  ttsConfigured,
  progressCurrent,
  progressTotal,
  onPlay,
  onPause,
  onResume,
  onStop,
  onReplay,
  onSpeed,
  onVoice,
}: Props) {
  const playing = status === "playing";
  const ratio = knownDuration && knownDuration > 0 ? Math.min(1, elapsed / knownDuration) : progressTotal ? progressCurrent / progressTotal : 0;
  const bars = Array.from({ length: 12 }, (_, index) => {
    const filled = index / 12 <= ratio;
    const height = 18 + ((index * 17) % 28);
    return { filled, height };
  });

  return (
    <Card className="blind-player">
      <div className="player-row">
        <div className="progress-bars" role="img" aria-label="تصور تقدم القراءة وليس موجة صوتية مسجّلة">
          {bars.map((bar, index) => (
            <span
              key={index}
              className={bar.filled ? "active" : undefined}
              style={{ height: `${bar.height}px` }}
            />
          ))}
        </div>
        <div className="player-controls">
          <Button className="player-btn" variant="ghost" type="button" onClick={onReplay} aria-label="إعادة القراءة">
            ↻
          </Button>
          <Button
            className="player-btn primary"
            type="button"
            onClick={playing ? onPause : status === "paused" ? onResume : onPlay}
            aria-label={playing ? "إيقاف مؤقت" : status === "paused" ? "استئناف القراءة" : "تشغيل"}
          >
            {playing ? "❚❚" : "▶"}
          </Button>
          <Button className="player-btn" variant="ghost" type="button" onClick={onStop} aria-label="إيقاف">
            ■
          </Button>
        </div>
      </div>
      <div className="player-meta">
        <span>
          {knownDuration
            ? `${formatTime(elapsed)} / ${formatTime(knownDuration)}`
            : playing
              ? "جاري القراءة"
              : status === "loading"
                ? "جاري تجهيز الصوت..."
                : "جاهز للقراءة"}
        </span>
        {ttsConfigured ? <span className="muted">يمكن استخدام صوت الخادم إن توفر</span> : null}
      </div>
      <div className="player-settings">
        <span id="speed-label">السرعة</span>
        {[0.8, 1, 1.5].map((speed) => (
          <button
            key={speed}
            type="button"
            className={`speed-chip ${speechRate === speed ? "selected" : ""}`}
            onClick={() => onSpeed(speed)}
            aria-pressed={speechRate === speed}
            aria-labelledby="speed-label"
          >
            x{speed}
          </button>
        ))}
        {recommendedSpeed && recommendedSpeed !== speechRate ? (
          <span className="muted">يمكن التجربة بسرعة أبطأ إن رغبت</span>
        ) : null}
      </div>
      <div className="player-settings">
        <span id="voice-label">الصوت</span>
        {!arabicAvailable ? (
          <p className="muted" role="status">
            لا يتوفر صوت عربي على هذا الجهاز.
            {ttsConfigured ? " يمكن تجربة صوت الخادم." : " يمكنك متابعة الدرس بالنص."}
          </p>
        ) : genderSupported ? (
          ["female", "male"].map((gender) => {
            const voice = voices.find((item) => inferVoiceGender(item.name) === gender);
            if (!voice) return null;
            const label = gender === "female" ? "أنثى" : "ذكر";
            return (
              <button
                key={gender}
                type="button"
                className={`voice-chip ${voiceURI === voice.voiceURI ? "selected" : ""}`}
                onClick={() => onVoice(voice.voiceURI)}
                aria-pressed={voiceURI === voice.voiceURI}
                aria-labelledby="voice-label"
              >
                {label}
              </button>
            );
          })
        ) : (
          voices.map((voice) => (
            <button
              key={voice.voiceURI}
              type="button"
              className={`voice-chip ${voiceURI === voice.voiceURI ? "selected" : ""}`}
              onClick={() => onVoice(voice.voiceURI)}
              aria-pressed={voiceURI === voice.voiceURI}
            >
              {voice.name}
            </button>
          ))
        )}
      </div>
    </Card>
  );
}

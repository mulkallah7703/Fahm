import { useEffect, useState } from "react";
import { Button } from "../common/Button";

interface Props {
  disabled: boolean;
  onSend: (text: string) => void;
}

type SpeechCtor = new () => {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function speechCtor(): SpeechCtor | null {
  const host = window as Window & { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

export function ChatComposer({ disabled, onSend }: Props) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);

  useEffect(() => {
    setCanSpeak(Boolean(speechCtor()));
  }, []);

  const send = () => {
    const next = text.trim();
    if (!next || disabled) return;
    onSend(next);
    setText("");
  };

  const listen = () => {
    const Ctor = speechCtor();
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.lang = "ar-SA";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const spoken = event.results[0]?.[0]?.transcript ?? "";
      if (spoken) setText((current) => (current ? `${current} ${spoken}` : spoken));
    };
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  };

  return (
    <form
      className="ask-composer"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <label className="sr-only" htmlFor="ask-input">
        اكتب سؤالك عن هذه الصفحة
      </label>
      <textarea
        id="ask-input"
        className="ask-input"
        value={text}
        disabled={disabled}
        maxLength={500}
        placeholder="اكتب سؤالك عن هذه الصفحة..."
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            send();
          }
          if (event.key === "Escape") (event.target as HTMLTextAreaElement).blur();
        }}
      />
      {canSpeak ? (
        <Button variant="ghost" type="button" disabled={disabled} onClick={listen} aria-pressed={listening}>
          {listening ? "يستمع" : "ميكروفون"}
        </Button>
      ) : null}
      <Button type="submit" disabled={disabled || !text.trim()}>
        أرسل
      </Button>
    </form>
  );
}

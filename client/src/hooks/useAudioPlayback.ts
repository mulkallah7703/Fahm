import { useCallback, useEffect, useRef, useState } from "react";
import { lessonApi } from "../services/lessonApi";
import {
  inferVoiceGender,
  reduceAudioStatus,
  splitSpokenSentences,
  type AudioStatus,
} from "../services/audio/audioState";
import type { TtsResponse } from "../types";

interface PlayInput {
  text: string;
  rate: number;
  voiceURI: string | null;
  sessionId?: string;
  segmentId?: string;
  ttsConfigured?: boolean;
}

export function useAudioPlayback() {
  const [status, setStatus] = useState<AudioStatus>("idle");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string | null>(null);
  const [arabicAvailable, setArabicAvailable] = useState(false);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [sentences, setSentences] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [knownDuration, setKnownDuration] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const playId = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const refreshVoices = useCallback(() => {
    if (!window.speechSynthesis) {
      setVoices([]);
      setArabicAvailable(false);
      return;
    }
    const list = window.speechSynthesis.getVoices();
    const arabic = list.filter((voice) => voice.lang.toLowerCase().startsWith("ar"));
    setVoices(list);
    setArabicAvailable(arabic.length > 0);
    setVoiceURI((current) => current ?? arabic[0]?.voiceURI ?? null);
  }, []);

  useEffect(() => {
    refreshVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", refreshVoices);
    return () => {
      window.speechSynthesis?.removeEventListener("voiceschanged", refreshVoices);
      window.speechSynthesis?.cancel();
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [refreshVoices]);

  const stop = useCallback(() => {
    playId.current += 1;
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setElapsed(0);
    setSentenceIndex(0);
    setStatus((current) => reduceAudioStatus(current, "stop"));
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
    else window.speechSynthesis?.pause();
    setStatus((current) => reduceAudioStatus(current, "pause"));
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) void audioRef.current.play();
    else window.speechSynthesis?.resume();
    setStatus((current) => reduceAudioStatus(current, "resume"));
  }, []);

  const play = useCallback(
    async (input: PlayInput) => {
      const token = ++playId.current;
      const parts = splitSpokenSentences(input.text);
      setSentences(parts);
      setSentenceIndex(0);
      setError(null);
      setKnownDuration(null);
      setElapsed(0);
      setStatus("loading");

      if (input.ttsConfigured && input.sessionId && input.segmentId) {
        try {
          const tts: TtsResponse = await lessonApi.blindAudio(input.sessionId, input.segmentId);
          if (token !== playId.current) return;
          if (!tts.fallback && tts.audioId) {
            const audio = new Audio(`/api/tts/${tts.audioId}`);
            audioRef.current = audio;
            audio.playbackRate = input.rate;
            setKnownDuration(tts.durationSeconds);
            audio.onended = () => {
              if (token !== playId.current) return;
              setStatus("completed");
            };
            audio.ontimeupdate = () => {
              if (token !== playId.current) return;
              setElapsed(audio.currentTime);
              if (audio.duration && Number.isFinite(audio.duration)) {
                setKnownDuration(audio.duration);
              }
            };
            audio.onerror = () => {
              if (token !== playId.current) return;
              setError("تعذر تشغيل الصوت على هذا الجهاز.");
              setStatus("error");
            };
            await audio.play();
            setStatus("playing");
            return;
          }
        } catch {
          if (token !== playId.current) return;
        }
      }

      if (!window.speechSynthesis) {
        setError("تعذر تشغيل الصوت على هذا الجهاز.");
        setStatus("error");
        return;
      }

      window.speechSynthesis.cancel();
      const preferred = window.speechSynthesis.getVoices().find((voice) => voice.voiceURI === input.voiceURI);
      const speakNext = (index: number) => {
        if (token !== playId.current) return;
        if (index >= parts.length) {
          setStatus("completed");
          return;
        }
        setSentenceIndex(index);
        const utterance = new SpeechSynthesisUtterance(parts[index]);
        utterance.rate = input.rate;
        utterance.lang = preferred?.lang ?? "ar-SA";
        if (preferred) utterance.voice = preferred;
        utterance.onend = () => speakNext(index + 1);
        utterance.onerror = () => {
          if (token !== playId.current) return;
          setError("تعذر تشغيل الصوت على هذا الجهاز.");
          setStatus("error");
        };
        window.speechSynthesis.speak(utterance);
        setStatus("playing");
      };
      speakNext(0);
    },
    [],
  );

  const arabicVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("ar"));
  const genderSupported = arabicVoices.some((voice) => inferVoiceGender(voice.name) !== "unknown");

  return {
    status,
    voices: arabicVoices,
    allVoices: voices,
    voiceURI,
    setVoiceURI,
    arabicAvailable,
    genderSupported,
    sentenceIndex,
    sentences,
    error,
    knownDuration,
    elapsed,
    play,
    pause,
    resume,
    stop,
  };
}

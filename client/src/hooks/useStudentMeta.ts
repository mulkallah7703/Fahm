import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface PageReadyMeta {
  title: string;
  pageNumber: number | null;
  conceptCount: number | null;
  wordCount: number | null;
}

export interface LessonStepMeta {
  title: string;
  status: "not_started" | "in_progress" | "completed" | "needs_review";
}

interface StudentMeta {
  displayName?: string;
  gradeLevel?: string | null;
  preferredMode?: string | null;
  preferredModeName?: string | null;
  pageReady?: PageReadyMeta | null;
  lessonSteps?: LessonStepMeta[] | null;
  lessonStepsLabel?: string | null;
  lessonModeName?: string | null;
  changeModeHref?: string | null;
  classInfo?: { kicker: string; title: string; detail: string } | null;
}

interface StudentMetaContextValue extends StudentMeta {
  setMeta: (meta: StudentMeta) => void;
}

const StudentMetaContext = createContext<StudentMetaContextValue | null>(null);

export function StudentMetaProvider({ children }: { children: ReactNode }) {
  const [meta, setMetaState] = useState<StudentMeta>({});
  const setMeta = useCallback((next: StudentMeta) => {
    setMetaState((current) => ({ ...current, ...next }));
  }, []);
  const value = useMemo(() => ({ ...meta, setMeta }), [meta, setMeta]);
  return createElement(StudentMetaContext.Provider, { value }, children);
}

export function useStudentMeta(): StudentMetaContextValue {
  const ctx = useContext(StudentMetaContext);
  if (!ctx) throw new Error("useStudentMeta must be used within provider");
  return ctx;
}

import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { ConceptList } from "../components/knowledgeMap/ConceptList";
import { ConceptPanel } from "../components/knowledgeMap/ConceptPanel";
import { MapCanvas } from "../components/knowledgeMap/MapCanvas";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { ErrorState } from "../components/common/ErrorState";
import { Skeleton } from "../components/common/Skeleton";
import { useAudioPlayback } from "../hooks/useAudioPlayback";
import { useKnowledgeMap } from "../hooks/useKnowledgeMap";
import { useStudentMeta } from "../hooks/useStudentMeta";
import {
  detailOf,
  filterNodes,
  mapNarration,
  sortReview,
  statsLabel,
  statusMeta,
} from "../components/knowledgeMap/mapView";
import type { KnowledgeMapDto, MapFilter } from "../types";
import "../components/common/common.css";
import "../components/lesson/lesson.css";
import "../components/knowledgeMap/knowledgeMap.css";

interface ShellContext {
  openMenu: () => void;
}

const FILTERS: { id: MapFilter; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "strong", label: "مفهوم" },
  { id: "review", label: "يحتاج مراجعة" },
  { id: "extra", label: "شرح إضافي" },
  { id: "unassessed", label: "غير المُقيَّم" },
  { id: "current", label: "الحالي" },
];

export function KnowledgeMapPage() {
  const { sessionId } = useParams();
  const { openMenu } = useOutletContext<ShellContext>();
  const { setMeta } = useStudentMeta();
  const map = useKnowledgeMap(sessionId);
  const audio = useAudioPlayback();
  const [scale, setScale] = useState(1);
  const [panelOpen, setPanelOpen] = useState(true);
  const data = map.data;

  useEffect(() => {
    if (!data) return;
    setMeta({
      pageReady: {
        title: data.scope.title,
        pageNumber: data.scope.pageNumber,
        conceptCount: data.stats.conceptCount,
        wordCount: null,
      },
      lessonModeName: data.scope.modeCode,
      changeModeHref: data.scope.materialId ? `/lesson/${data.scope.materialId}/mode` : null,
    });
    return () => setMeta({ pageReady: null, lessonModeName: null, changeModeHref: null });
  }, [data, setMeta]);

  useEffect(() => {
    return () => audio.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const visible = useMemo(() => {
    if (!data) return [];
    const filtered = filterNodes(data.nodes, map.filter);
    return map.filter === "review" ? sortReview(filtered) : filtered;
  }, [data, map.filter]);

  const detail = data ? detailOf(data, map.selectedId) : null;
  const wrapStyle = data?.presentation.dyslexia
    ? {
        fontSize: data.presentation.fontSize ? `${data.presentation.fontSize}px` : undefined,
        lineHeight: data.presentation.lineSpacing ?? 1.9,
      }
    : undefined;

  if (map.loading) {
    return (
      <div aria-busy="true" aria-live="polite">
        <Skeleton height="36px" width="220px" />
        <Skeleton height="320px" />
      </div>
    );
  }

  if (!data) {
    return <ErrorState title="لم يتم العثور على الخريطة." message={map.error ?? "تعذر تحميل خريطة المعرفة."} onRetry={() => void map.reload()} />;
  }

  const listen = () => {
    const text = detail ? `${detail.name}. ${detail.description ?? ""} ${detail.insight ?? ""}`.trim() : mapNarration(data);
    void audio.play({ text, rate: 1, voiceURI: audio.voiceURI, sessionId: data.scope.sessionId ?? sessionId });
  };

  return (
    <main
      className={`map-wrap${data.presentation.dyslexia ? " map-dyslexia" : ""}`}
      lang="ar"
      dir="rtl"
      style={wrapStyle}
      onKeyDown={(event) => {
        if (event.key === "Escape") setPanelOpen(false);
      }}
    >
      <header className="map-header">
        <div>
          <Button className="menu-toggle" variant="ghost" type="button" onClick={openMenu}>
            القائمة
          </Button>
          <div className="mode-chip">Knowledge mapping</div>
          <h1>خريطة المعرفة</h1>
          <p className="lesson-meta">المفاهيم مترابطة كما ظهرت في درسك</p>
          <p>{statsLabel(data)}</p>
        </div>
        <div className="map-actions">
          <div className="map-toggle" role="group" aria-label="طريقة العرض">
            <button type="button" aria-pressed={map.view === "map"} onClick={() => map.setView("map")}>
              الخريطة
            </button>
            <button type="button" aria-pressed={map.view === "list"} onClick={() => map.setView("list")}>
              قائمة
            </button>
          </div>
          {data.stats.reviewCount + data.stats.extraCount > 0 ? (
            <Button type="button" variant="ghost" disabled={map.acting} onClick={() => void map.action("review")}>
              مراجعة المفاهيم
            </Button>
          ) : null}
          {data.scope.sessionId || sessionId ? (
            <Button
              type="button"
              variant="ghost"
              disabled={map.acting || data.nodes.length === 0}
              onClick={() => void map.action("test", map.selectedId ?? data.recommendation?.conceptId ?? data.nodes[0]?.conceptId)}
            >
              اختبرني على الخريطة
            </Button>
          ) : null}
        </div>
      </header>

      {map.error ? <p className="status-err" role="alert">{map.error}</p> : null}

      {data.pulse ? (
        <p className="map-pulse">
          نبض التعلم: {data.pulse.reviewCount} مفاهيم تحتاج مراجعة
          {data.pulse.extraCount ? ` · ${data.pulse.extraCount} تحتاج شرحًا إضافيًا` : ""}
        </p>
      ) : null}

      {data.emptyMessage ? (
        <Card>
          <p>{data.emptyMessage}</p>
          {data.emptyHint ? <p className="muted">{data.emptyHint}</p> : null}
        </Card>
      ) : null}

      <div className="map-filters" role="group" aria-label="تصفية المفاهيم">
        {FILTERS.filter((item) => item.id !== "current" || data.nodes.some((node) => node.isCurrent)).map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={map.filter === item.id}
            onClick={() => map.setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="map-page">
        <section className="map-stage" aria-label="خريطة المعرفة البصرية">
          {data.presentation.blind ? (
            <AccessibleList data={data} />
          ) : map.view === "map" ? (
            <>
              <MapCanvas data={{ ...data, nodes: visible }} selectedId={map.selectedId} scale={scale} onSelect={(id) => void map.select(id)} />
              <div className="map-legend" aria-label="دليل الحالة">
                {(["strong", "review", "extra"] as const).map((status) => {
                  const meta = statusMeta(status);
                  return (
                    <span key={status}>
                      <span aria-hidden="true">{meta.icon}</span> {meta.label}
                    </span>
                  );
                })}
              </div>
              <div className="map-zoom">
                <Button type="button" variant="ghost" aria-label="تكبير الخريطة" onClick={() => setScale((value) => Math.min(1.8, value + 0.15))}>
                  +
                </Button>
                <Button type="button" variant="ghost" aria-label="تصغير الخريطة" onClick={() => setScale((value) => Math.max(0.7, value - 0.15))}>
                  −
                </Button>
                <Button type="button" variant="ghost" aria-label="إعادة ضبط الخريطة" onClick={() => setScale(1)}>
                  إعادة ضبط
                </Button>
              </div>
            </>
          ) : (
            <ConceptList
              data={data}
              nodes={visible}
              selectedId={map.selectedId}
              acting={map.acting}
              onSelect={(id) => void map.select(id)}
              onExplain={(id) => void map.action("explain", id)}
              onAsk={(id) => void map.action("ask", id)}
              onTest={(id) => void map.action("test", id)}
            />
          )}
        </section>

        <div className={`map-side${panelOpen ? " open" : ""}`}>
          <Button className="map-side-toggle" variant="ghost" type="button" onClick={() => setPanelOpen((open) => !open)}>
            {panelOpen ? "إخفاء التفاصيل" : "عرض التفاصيل"}
          </Button>
          {panelOpen ? (
            <ConceptPanel
              data={data}
              detail={detail}
              acting={map.acting}
              onExplain={() => void map.action("explain", map.selectedId ?? undefined)}
              onAsk={() => void map.action("ask", map.selectedId ?? undefined)}
              onTest={() => void map.action("test", map.selectedId ?? undefined)}
              onListen={listen}
              onStartRecommended={() => void map.action("explain", data.recommendation?.conceptId)}
            />
          ) : null}
        </div>
      </div>

      {!data.presentation.blind ? (
        <section className="map-a11y" aria-label="تمثيل بديل للخريطة">
          <div className="map-actions">
            <Button type="button" variant="ghost" onClick={() => void audio.play({ text: mapNarration(data), rate: 1, voiceURI: audio.voiceURI, sessionId: data.scope.sessionId ?? sessionId })}>
              اقرأ الخريطة
            </Button>
          </div>
          <AccessibleList data={data} />
        </section>
      ) : (
        <Button type="button" onClick={() => void audio.play({ text: mapNarration(data), rate: 1, voiceURI: audio.voiceURI, sessionId: data.scope.sessionId ?? sessionId })}>
          اقرأ الخريطة
        </Button>
      )}
    </main>
  );
}

function AccessibleList({ data }: { data: KnowledgeMapDto }) {
  return (
    <Card>
      <h2>المفاهيم في هذه الصفحة</h2>
      <ol>
        {data.nodes.map((node) => {
          const related = data.edges
            .filter((edge) => edge.sourceConceptId === node.conceptId || edge.targetConceptId === node.conceptId)
            .map((edge) => {
              const otherId = edge.sourceConceptId === node.conceptId ? edge.targetConceptId : edge.sourceConceptId;
              return data.nodes.find((item) => item.conceptId === otherId)?.label;
            })
            .filter(Boolean);
          return (
            <li key={node.conceptId}>
              {node.label}
              <br />
              {related.length ? `يرتبط بـ ${related.join(" و ")}` : "لا توجد علاقات محفوظة"}
              <br />
              حالتك: {node.masteryBand}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}


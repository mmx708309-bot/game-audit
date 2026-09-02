/** حساب الجوائز وحفظ التقدم المحلي؛ لا يتصل بأي خدمة خارجية. */

import type { Choice, Outcome } from "./content";

export type Progress = {
  points: number;
  hearts: number;
  completed: string[];
  endings: string[];
  smartEscapes: number;
};

const KEY = "ehreb-el-moqleb-progress-v1";

export const defaultProgress: Progress = {
  points: 120,
  hearts: 3,
  completed: [],
  endings: [],
  smartEscapes: 0,
};

export function loadProgress(): Progress {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (!saved) return defaultProgress;
    return { ...defaultProgress, ...JSON.parse(saved) } as Progress;
  } catch {
    return defaultProgress;
  }
}

export function saveProgress(progress: Progress) {
  window.localStorage.setItem(KEY, JSON.stringify(progress));
}

export function addChoiceToProgress(progress: Progress, sceneId: string, selected: Choice): Progress {
  const endingId = `${sceneId}:${selected.id}`;
  const earned = selected.points + (selected.secret ? 10 : 0);
  const hearts = selected.outcome === "oops" ? Math.max(0, progress.hearts - 1) : Math.min(5, progress.hearts + (selected.outcome === "smart" ? 1 : 0));

  return {
    points: progress.points + earned,
    hearts,
    completed: Array.from(new Set([...progress.completed, sceneId])),
    endings: Array.from(new Set([...progress.endings, endingId])),
    smartEscapes: progress.smartEscapes + (selected.outcome === "smart" ? 1 : 0),
  };
}

export const outcomeCopy: Record<Outcome, { title: string; className: string; icon: string }> = {
  smart: { title: "خرجت بذكاء", className: "smart", icon: "✦" },
  close: { title: "نجيت بصعوبة", className: "close", icon: "~" },
  oops: { title: "المقلب مسك فيك", className: "oops", icon: "!" },
};

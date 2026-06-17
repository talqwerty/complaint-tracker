// Muted-pastel status/priority tags (minimalist-ui palette).
// Static Tailwind arbitrary-value classes so the v4 scanner keeps them.

const TAG_BASE = "border-transparent uppercase tracking-wide";

const STATUS_CLASSES: Record<string, string> = {
  Open: "bg-[#e1f3fe] text-[#1f6c9f]", // pale blue
  "In Progress": "bg-[#fbf3db] text-[#956400]", // pale yellow
  Resolved: "bg-[#edf3ec] text-[#346538]", // pale green
  Closed: "bg-[#f1f1ef] text-[#787774]", // neutral
};

const PRIORITY_CLASSES: Record<string, string> = {
  Critical: "bg-[#fdebec] text-[#9f2f2d]", // pale red
  High: "bg-[#fbf3db] text-[#956400]", // pale yellow
  Medium: "bg-[#e1f3fe] text-[#1f6c9f]", // pale blue
  Low: "bg-[#f1f1ef] text-[#787774]", // neutral
};

export function statusClass(status: string): string {
  return `${TAG_BASE} ${STATUS_CLASSES[status] ?? STATUS_CLASSES.Open}`;
}

export function priorityClass(priority: string): string {
  return `${TAG_BASE} ${PRIORITY_CLASSES[priority] ?? PRIORITY_CLASSES.Medium}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

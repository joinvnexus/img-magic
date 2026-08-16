import Link from "next/link";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  ANALYZING: "Analyzing…",
  READY: "Ready",
  FAILED: "Failed",
};

const STATUS_DOT: Record<string, string> = {
  DRAFT: "bg-text-muted",
  ANALYZING: "bg-accent animate-pulse",
  READY: "bg-success",
  FAILED: "bg-danger",
};

export interface ProjectCardData {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
  thumbnailKey: string | null;
}

export function ProjectCard({ project }: { project: ProjectCardData }) {
  return (
    <Link
      href={`/projects/${project.id}/editor`}
      className="group rounded-lg border border-border bg-bg-panel overflow-hidden hover:border-accent/50 transition-colors"
    >
      <div className="checker-bg aspect-[4/3] flex items-center justify-center overflow-hidden">
        {project.thumbnailKey ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/assets/${encodeURIComponent(project.thumbnailKey)}`}
            alt=""
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-text-muted text-sm">No preview</span>
        )}
      </div>
      <div className="p-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{project.name}</p>
          <p className="text-xs text-text-muted">{new Date(project.updatedAt).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[project.status] ?? "bg-text-muted"}`} />
          <span className="text-xs text-text-muted">{STATUS_LABEL[project.status] ?? project.status}</span>
        </div>
      </div>
    </Link>
  );
}

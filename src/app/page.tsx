import { prisma } from "@/server/db";
import { getCurrentUserId } from "@/server/auth/getCurrentUser";
import { UploadDropzone } from "@/components/dashboard/UploadDropzone";
import { ProjectCard } from "@/components/dashboard/ProjectCard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { assets: { where: { kind: "THUMBNAIL" }, take: 1 } },
  });

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Your projects</h1>
          <p className="text-sm text-text-muted">Upload an image to reconstruct it into editable layers.</p>
        </div>
      </header>

      <main className="flex-1 px-6 py-8 max-w-6xl w-full mx-auto">
        <UploadDropzone />

        {projects.length > 0 && (
          <section className="mt-10">
            <h2 className="text-sm font-medium text-text-muted mb-3">Recent projects</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {projects.map((p: (typeof projects)[number]) => (
                <ProjectCard
                  key={p.id}
                  project={{
                    id: p.id,
                    name: p.name,
                    status: p.status,
                    updatedAt: p.updatedAt.toISOString(),
                    thumbnailKey: p.assets[0]?.storageKey ?? null,
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

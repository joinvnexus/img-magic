import { prisma } from "@/server/db";

const DEV_USER_EMAIL = "dev@local.test";

/**
 * Returns the id of the "current user".
 *
 * Phase 1 has no real auth yet (that's Phase 7 — NextAuth/Clerk +
 * session-based ownership checks). Every API route already calls this
 * function and scopes every query by the returned userId, so wiring in
 * real sessions later is a one-file change here, not a rewrite of the
 * ownership-checking logic scattered through the app.
 */
export async function getCurrentUserId(): Promise<string> {
  const user = await prisma.user.upsert({
    where: { email: DEV_USER_EMAIL },
    update: {},
    create: { email: DEV_USER_EMAIL, name: "Dev User" },
  });
  return user.id;
}

/**
 * Throws if `userId` does not own `projectId`. Every route that accepts a
 * projectId from the client must call this before touching project data —
 * never trust an id from the browser without verifying ownership server-side.
 */
export async function assertProjectOwnership(projectId: string, userId: string): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });
  if (!project || project.userId !== userId) {
    throw new Error("NOT_FOUND_OR_FORBIDDEN");
  }
}

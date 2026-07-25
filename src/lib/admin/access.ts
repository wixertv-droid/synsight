import { getCurrentUser } from "@/lib/auth/session";
import { getUserRepository } from "@/lib/repositories";

/**
 * Admin gate: session user + fresh DB role check (M-06).
 * Never trust cookie/JWT role alone for privileged actions.
 */
export async function getAdminAccess() {
  const user = await getCurrentUser();
  if (!user) {
    return { granted: false as const, status: 401 as const, user: null };
  }

  const userId = Number.parseInt(user.id, 10);
  if (!Number.isFinite(userId)) {
    return { granted: false as const, status: 401 as const, user: null };
  }

  const dbUser = await getUserRepository().findById(userId);
  if (!dbUser || dbUser.status !== "active") {
    return { granted: false as const, status: 401 as const, user: null };
  }
  if (dbUser.role !== "admin") {
    return { granted: false as const, status: 403 as const, user };
  }

  return {
    granted: true as const,
    status: 200 as const,
    user: {
      ...user,
      role: "admin" as const,
      email: dbUser.email,
    },
  };
}

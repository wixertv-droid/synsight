import { getCurrentUser } from "@/lib/auth/session";

export async function getAdminAccess() {
  const user = await getCurrentUser();
  if (!user) {
    return { granted: false as const, status: 401 as const, user: null };
  }
  if (user.role !== "admin") {
    return { granted: false as const, status: 403 as const, user };
  }
  return { granted: true as const, status: 200 as const, user };
}

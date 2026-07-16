import type { UserRole } from "@/lib/auth/types";
import type { UserStatus } from "@/types/domain";

export interface AdminUserSummary {
  id: number;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  publicAlias: string | null;
  aliases: string[];
  status: UserStatus;
  role: UserRole;
  createdAt: string;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
}

export interface AdminSystemStats {
  usersTotal: number;
  administratorsTotal: number;
  registrationsToday: number;
}

export interface AdminRepository {
  searchUsers(query: string, limit?: number): Promise<AdminUserSummary[]>;
  findUserById(userId: number): Promise<AdminUserSummary | null>;
  getSystemStats(): Promise<AdminSystemStats>;
}

type MemoryUser = {
  id: number;
  email: string;
  username: string;
  status: UserStatus;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
};

const memory = globalThis as typeof globalThis & {
  __synsightUsers?: Map<number, MemoryUser>;
};

function toSummary(user: MemoryUser): AdminUserSummary {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    publicAlias: null,
    aliases: [],
    status: user.status,
    role: user.role,
    createdAt: new Date().toISOString(),
    emailVerifiedAt: user.status === "active" ? new Date().toISOString() : null,
    lastLoginAt: null,
  };
}

export function createInMemoryAdminRepository(): AdminRepository {
  return {
    async searchUsers(query, limit = 25) {
      const normalized = query.trim().toLowerCase();
      return [...(memory.__synsightUsers?.values() ?? [])]
        .filter((user) => {
          if (!normalized) return true;
          const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`;
          return [String(user.id), user.email, user.username, name].some(
            (value) => value.toLowerCase().includes(normalized)
          );
        })
        .slice(0, limit)
        .map(toSummary);
    },

    async findUserById(userId) {
      const user = memory.__synsightUsers?.get(userId);
      return user ? toSummary(user) : null;
    },

    async getSystemStats() {
      const users = [...(memory.__synsightUsers?.values() ?? [])];
      return {
        usersTotal: users.length,
        administratorsTotal: users.filter((user) => user.role === "admin")
          .length,
        registrationsToday: users.length,
      };
    },
  };
}

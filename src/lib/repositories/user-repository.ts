import { DEMO_USER } from "@/lib/demo/user";
import type { UserRole } from "@/lib/auth/types";
import type { UserStatus } from "@/types/domain";

/**
 * Persistence record returned by `UserRepository`.
 * Maps directly to the `users` table plus joined profile data when
 * available.
 */
export interface UserRecord {
  id: number;
  email: string;
  username: string;
  passwordHash: string;
  status: UserStatus;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
}

export interface UserRepository {
  findByUsername(username: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: number): Promise<UserRecord | null>;
  updateLastLogin(id: number): Promise<void>;
}

export function toDisplayName(record: Pick<UserRecord, "firstName" | "lastName" | "username">): string {
  if (record.firstName && record.lastName) {
    return `${record.firstName} ${record.lastName}`;
  }
  return record.username;
}

export function createInMemoryUserRepository(): UserRepository {
  return {
    async findByUsername(username: string) {
      if (username.trim().toLowerCase() !== "admin") {
        return null;
      }

      return {
        id: 1,
        email: DEMO_USER.email,
        username: "admin",
        passwordHash: "",
        status: "active",
        firstName: "Alex",
        lastName: "Morgan",
        role: "admin",
      };
    },

    async findByEmail(email: string) {
      if (email.trim().toLowerCase() !== DEMO_USER.email) {
        return null;
      }
      return this.findByUsername("admin");
    },

    async findById(id: number) {
      if (id !== 1) return null;
      return this.findByUsername("admin");
    },

    async updateLastLogin() {
      /* no-op for in-memory */
    },
  };
}

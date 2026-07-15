import { DEMO_USER } from "@/lib/demo/user";
import { DEV_ADMIN_PASSWORD_HASH } from "@/lib/auth/password";
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
  failedLoginAttempts: number;
  lockedUntil: string | null;
}

export interface CreateUserInput {
  email: string;
  username: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}

export interface UserRepository {
  findByUsername(username: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: number): Promise<UserRecord | null>;
  create(input: CreateUserInput): Promise<UserRecord>;
  activate(id: number): Promise<void>;
  recordFailedLogin(id: number, lockedUntil: string | null): Promise<void>;
  clearFailedLogins(id: number): Promise<void>;
  updateLastLogin(id: number): Promise<void>;
}

export function toDisplayName(
  record: Pick<UserRecord, "firstName" | "lastName" | "username">
): string {
  if (record.firstName && record.lastName) {
    return `${record.firstName} ${record.lastName}`;
  }
  return record.username;
}

const memory = globalThis as typeof globalThis & {
  __synsightUsers?: Map<number, UserRecord>;
  __synsightNextUserId?: number;
};

function getMemoryUsers(): Map<number, UserRecord> {
  if (!memory.__synsightUsers) {
    memory.__synsightUsers = new Map([
      [
        1,
        {
          id: 1,
          email: DEMO_USER.email,
          username: "admin",
          passwordHash: DEV_ADMIN_PASSWORD_HASH,
          status: "active",
          firstName: "Alex",
          lastName: "Morgan",
          role: "admin",
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      ],
    ]);
    memory.__synsightNextUserId = 2;
  }
  return memory.__synsightUsers;
}

export function createInMemoryUserRepository(): UserRepository {
  const users = getMemoryUsers();
  const find = (predicate: (user: UserRecord) => boolean) =>
    [...users.values()].find(predicate) ?? null;

  return {
    async findByUsername(username: string) {
      const normalized = username.trim().toLowerCase();
      return find((user) => user.username.toLowerCase() === normalized);
    },

    async findByEmail(email: string) {
      const normalized = email.trim().toLowerCase();
      return find((user) => user.email.toLowerCase() === normalized);
    },

    async findById(id: number) {
      return users.get(id) ?? null;
    },

    async create(input) {
      const id = memory.__synsightNextUserId ?? 2;
      memory.__synsightNextUserId = id + 1;
      const user: UserRecord = {
        id,
        email: input.email,
        username: input.username,
        passwordHash: input.passwordHash,
        status: "pending_verification",
        firstName: input.firstName,
        lastName: input.lastName,
        role: "demo",
        failedLoginAttempts: 0,
        lockedUntil: null,
      };
      users.set(id, user);
      return user;
    },

    async activate(id) {
      const user = users.get(id);
      if (user) user.status = "active";
    },

    async recordFailedLogin(id, lockedUntil) {
      const user = users.get(id);
      if (user) {
        user.failedLoginAttempts += 1;
        user.lockedUntil = lockedUntil;
      }
    },

    async clearFailedLogins(id) {
      const user = users.get(id);
      if (user) {
        user.failedLoginAttempts = 0;
        user.lockedUntil = null;
      }
    },

    async updateLastLogin() {
      /* no-op for in-memory */
    },
  };
}

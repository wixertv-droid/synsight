export type UserTokenType = "password_reset" | "email_verification" | "api_key";

export interface UserTokenRecord {
  id: number;
  userId: number;
  tokenHash: string;
  tokenType: UserTokenType;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

export interface UserTokenRepository {
  create(input: {
    userId: number;
    tokenHash: string;
    tokenType: UserTokenType;
    expiresAt: string;
  }): Promise<UserTokenRecord>;
  findValid(
    tokenHash: string,
    tokenType: UserTokenType
  ): Promise<UserTokenRecord | null>;
  findByHash(
    tokenHash: string,
    tokenType: UserTokenType
  ): Promise<UserTokenRecord | null>;
  markUsed(id: number): Promise<void>;
  revokeForUser(userId: number, tokenType: UserTokenType): Promise<void>;
}

const memory = globalThis as typeof globalThis & {
  __synsightUserTokens?: Map<number, UserTokenRecord>;
  __synsightNextTokenId?: number;
};

export function createInMemoryUserTokenRepository(): UserTokenRepository {
  const tokens =
    memory.__synsightUserTokens ??
    (memory.__synsightUserTokens = new Map<number, UserTokenRecord>());

  return {
    async create(input) {
      const id = memory.__synsightNextTokenId ?? 1;
      memory.__synsightNextTokenId = id + 1;
      const token: UserTokenRecord = {
        id,
        ...input,
        usedAt: null,
        createdAt: new Date().toISOString(),
      };
      tokens.set(id, token);
      return token;
    },
    async findValid(tokenHash, tokenType) {
      return (
        [...tokens.values()].find(
          (token) =>
            token.tokenHash === tokenHash &&
            token.tokenType === tokenType &&
            !token.usedAt &&
            new Date(token.expiresAt) > new Date()
        ) ?? null
      );
    },
    async findByHash(tokenHash, tokenType) {
      return (
        [...tokens.values()].find(
          (token) =>
            token.tokenHash === tokenHash && token.tokenType === tokenType
        ) ?? null
      );
    },
    async markUsed(id) {
      const token = tokens.get(id);
      if (token) token.usedAt = new Date().toISOString();
    },
    async revokeForUser(userId, tokenType) {
      const now = new Date().toISOString();
      for (const token of tokens.values()) {
        if (
          token.userId === userId &&
          token.tokenType === tokenType &&
          !token.usedAt
        ) {
          token.usedAt = now;
        }
      }
    },
  };
}

// src/utils/tokenCreationSessions.ts
interface TokenCreationSession {
  userId: number;
  name?: string;
  symbol?: string;
  uri?: string;
  step: "name" | "symbol" | "uri" | "confirm";
}

const sessions = new Map<number, TokenCreationSession>();

export const getSession = (
  userId: number
): TokenCreationSession | undefined => {
  return sessions.get(userId);
};

export const createSession = (userId: number): TokenCreationSession => {
  const session: TokenCreationSession = {
    userId,
    step: "name",
  };
  sessions.set(userId, session);
  return session;
};

export const updateSession = (
  userId: number,
  data: Partial<TokenCreationSession>
) => {
  const session = sessions.get(userId);
  if (session) {
    sessions.set(userId, { ...session, ...data });
  }
};

export const deleteSession = (userId: number) => {
  sessions.delete(userId);
};

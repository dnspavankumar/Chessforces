import { Board, Color, initialBoard } from './chess';
import { redis } from './redis';

export type GameState = {
  id: string;
  board: Board;
  turn: Color;
  players: { white: string | null; black: string | null };
  playerNames: { white: string | null; black: string | null };
  status: 'waiting' | 'active' | 'finished';
  winner: Color | 'draw' | null;
  lastMove: number;
};

// Fallback in-memory storage if Redis is not configured
const memoryGames = new Map<string, GameState>();

const GAME_PREFIX = 'game:';
const GAME_TTL = 86400; // 24 hours

export const createGame = async (gameId: string): Promise<GameState> => {
  const game: GameState = {
    id: gameId,
    board: initialBoard(),
    turn: 'w',
    players: { white: null, black: null },
    playerNames: { white: null, black: null },
    status: 'waiting',
    winner: null,
    lastMove: Date.now(),
  };

  if (redis) {
    // Upstash Redis automatically handles JSON serialization
    await redis.set(`${GAME_PREFIX}${gameId}`, game, { ex: GAME_TTL });
  } else {
    memoryGames.set(gameId, game);
  }

  return game;
};

export const getGame = async (gameId: string): Promise<GameState | null> => {
  if (redis) {
    // Upstash Redis automatically deserializes JSON
    const data = await redis.get<GameState>(`${GAME_PREFIX}${gameId}`);
    return data || null;
  } else {
    return memoryGames.get(gameId) || null;
  }
};

export const updateGame = async (
  gameId: string,
  updates: Partial<GameState>
): Promise<GameState | null> => {
  const game = await getGame(gameId);
  if (!game) return null;

  const updated = { ...game, ...updates, lastMove: Date.now() };

  if (redis) {
    // Upstash Redis automatically handles JSON serialization
    await redis.set(`${GAME_PREFIX}${gameId}`, updated, { ex: GAME_TTL });
  } else {
    memoryGames.set(gameId, updated);
  }

  return updated;
};

export const joinGame = async (
  gameId: string,
  playerId: string,
  username: string
): Promise<{ game: GameState; color: Color; playerId: string } | null> => {
  const game = await getGame(gameId);
  if (!game) return null;

  // Check if player already joined
  if (game.players.white === playerId) {
    return { game, color: 'w', playerId };
  }
  if (game.players.black === playerId) {
    return { game, color: 'b', playerId };
  }

  // Assign to empty slot
  if (!game.players.white) {
    game.players.white = playerId;
    game.playerNames.white = username;
    await updateGame(gameId, game);
    return { game, color: 'w', playerId };
  } else if (!game.players.black) {
    game.players.black = playerId;
    game.playerNames.black = username;
    game.status = 'active';
    await updateGame(gameId, game);
    return { game, color: 'b', playerId };
  }

  // Game is full
  return null;
};

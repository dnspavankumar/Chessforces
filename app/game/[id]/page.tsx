'use client';

import { use, useEffect, useState } from 'react';
import { Board, Color, Position, getValidMoves, PieceType } from '@/lib/chess';

type GameState = {
  id: string;
  board: Board;
  turn: Color;
  players: { white: string | null; black: string | null };
  playerNames: { white: string | null; black: string | null };
  status: 'waiting' | 'active' | 'finished';
  winner: Color | 'draw' | null;
  lastMove: number;
};

const pieceSymbols: Record<string, string> = {
  'wp': '♙', 'wr': '♖', 'wn': '♘', 'wb': '♗', 'wq': '♕', 'wk': '♔',
  'bp': '♟', 'br': '♜', 'bn': '♞', 'bb': '♝', 'bq': '♛', 'bk': '♚',
};

const pieceValues: Record<PieceType, number> = {
  'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0
};

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function setCookie(name: string, value: string, days: number = 7) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

function calculateMaterial(board: Board) {
  const captured = { white: [] as PieceType[], black: [] as PieceType[] };
  const initial = {
    p: 8, r: 2, n: 2, b: 2, q: 1, k: 1
  };
  const current = {
    white: { p: 0, r: 0, n: 0, b: 0, q: 0, k: 0 },
    black: { p: 0, r: 0, n: 0, b: 0, q: 0, k: 0 }
  };

  // Count current pieces
  board.forEach(row => {
    row.forEach(piece => {
      if (piece) {
        current[piece.color === 'w' ? 'white' : 'black'][piece.type]++;
      }
    });
  });

  // Calculate captured pieces
  (['p', 'r', 'n', 'b', 'q', 'k'] as PieceType[]).forEach(type => {
    const whiteLost = initial[type] - current.white[type];
    const blackLost = initial[type] - current.black[type];

    for (let i = 0; i < whiteLost; i++) captured.black.push(type);
    for (let i = 0; i < blackLost; i++) captured.white.push(type);
  });

  // Calculate scores
  const whiteScore = captured.white.reduce((sum, type) => sum + pieceValues[type], 0);
  const blackScore = captured.black.reduce((sum, type) => sum + pieceValues[type], 0);

  return {
    captured,
    advantage: whiteScore - blackScore
  };
}

export default function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [game, setGame] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [playerColor, setPlayerColor] = useState<Color | null>(null);
  const [selected, setSelected] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [error, setError] = useState('');
  const [dragFrom, setDragFrom] = useState<Position | null>(null);
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [username, setUsername] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [lastMovePositions, setLastMovePositions] = useState<{ from: Position | null, to: Position | null }>({ from: null, to: null });

  useEffect(() => {
    let pid = getCookie(`player_${id}`);
    if (!pid) {
      pid = Math.random().toString(36).substring(2, 15);
      setCookie(`player_${id}`, pid);
    }
    setPlayerId(pid);
  }, [id]);

  const fetchGame = async () => {
    if (!playerId) return;
    try {
      const res = await fetch(`/api/game/${id}`);
      if (res.ok) {
        const data = await res.json();
        setGame(data);

        if (data.players.white === playerId) {
          setPlayerColor('w');
        } else if (data.players.black === playerId) {
          setPlayerColor('b');
        } else {
          setPlayerColor(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch game', err);
    }
  };

  const joinGameWithUsername = async () => {
    if (!username.trim() || !playerId) return;

    setIsJoining(true);
    try {
      const res = await fetch(`/api/game/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', playerId, username: username.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setGame(data.game);
        setPlayerColor(data.color);
        setShowUsernamePrompt(false);
        setError('');
      } else {
        const data = await res.json();
        setError(data.error || 'Cannot join game');
      }
    } catch (err) {
      setError('Failed to join game');
    } finally {
      setIsJoining(false);
    }
  };

  useEffect(() => {
    if (!playerId) return;
    fetchGame();

    const timer = setTimeout(() => {
      if (game && !playerColor && game.status === 'waiting') {
        setShowUsernamePrompt(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [playerId, game?.status]);

  useEffect(() => {
    if (!playerId) return;
    const interval = setInterval(fetchGame, 1000);
    return () => clearInterval(interval);
  }, [playerId]);

  const makeMove = async (from: Position, to: Position) => {
    const res = await fetch(`/api/game/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'move',
        playerId,
        from,
        to,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setGame(data);
      setSelected(null);
      setValidMoves([]);
      setLastMovePositions({ from, to });
      setError('');
    } else {
      const data = await res.json();
      setError(data.error || 'Invalid move');
    }
  };

  const handleSquareClick = async (row: number, col: number) => {
    if (!game || game.status !== 'active' || game.turn !== playerColor) return;

    const piece = game.board[row][col];

    if (!selected) {
      if (piece && piece.color === playerColor) {
        setSelected({ row, col });
        setValidMoves(getValidMoves(game.board, { row, col }, playerColor));
        setError('');
      }
    } else {
      if (row === selected.row && col === selected.col) {
        setSelected(null);
        setValidMoves([]);
        return;
      }

      const isValid = validMoves.some(move => move.row === row && move.col === col);
      if (isValid) {
        await makeMove(selected, { row, col });
      } else if (piece && piece.color === playerColor) {
        setSelected({ row, col });
        setValidMoves(getValidMoves(game.board, { row, col }, playerColor));
        setError('');
      } else {
        setSelected(null);
        setValidMoves([]);
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, row: number, col: number) => {
    if (!game || game.status !== 'active' || game.turn !== playerColor) {
      e.preventDefault();
      return;
    }

    const piece = game.board[row][col];
    if (!piece || piece.color !== playerColor) {
      e.preventDefault();
      return;
    }

    setDragFrom({ row, col });
    setSelected({ row, col });
    setValidMoves(getValidMoves(game.board, { row, col }, playerColor));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();

    if (!dragFrom) return;

    const isValid = validMoves.some(move => move.row === row && move.col === col);
    if (isValid) {
      await makeMove(dragFrom, { row, col });
    }
    setDragFrom(null);
  };

  if (!game) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-300 text-lg">Loading game...</p>
        </div>
      </div>
    );
  }

  if (showUsernamePrompt && !playerColor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-md w-full px-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 md:p-8 shadow-2xl">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">Join Game</h1>
            <p className="text-gray-300 mb-6">Enter your name to join this game:</p>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && joinGameWithUsername()}
              placeholder="Your name"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 mb-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
              disabled={isJoining}
            />
            {error && <p className="text-red-400 mb-4 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={joinGameWithUsername}
                disabled={!username.trim() || isJoining}
                className="flex-1 bg-green-600 text-white font-semibold px-4 md:px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed text-sm md:text-base"
              >
                {isJoining ? 'Joining...' : 'Join Game'}
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 bg-gray-700 text-white font-semibold px-4 md:px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors text-sm md:text-base"
                disabled={isJoining}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!playerColor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-lg w-full text-center px-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 md:p-8 shadow-2xl">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">Game Full</h1>
            <p className="text-gray-300 mb-6">This game already has two players:</p>
            <div className="bg-gray-700 rounded-lg p-4 md:p-6 mb-6">
              <p className="text-white mb-2">
                <span className="font-semibold text-gray-300">White:</span> {game.playerNames.white || 'Unknown'}
              </p>
              <p className="text-white">
                <span className="font-semibold text-gray-300">Black:</span> {game.playerNames.black || 'Unknown'}
              </p>
            </div>
            <p className="text-gray-400 mb-6 text-sm">You cannot join as a spectator.</p>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-green-600 text-white font-semibold px-6 md:px-8 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { captured, advantage } = calculateMaterial(game.board);

  const isValidMoveSquare = (row: number, col: number) => {
    return validMoves.some(move => move.row === row && move.col === col);
  };

  const isLastMoveSquare = (row: number, col: number) => {
    return (lastMovePositions.from?.row === row && lastMovePositions.from?.col === col) ||
      (lastMovePositions.to?.row === row && lastMovePositions.to?.col === col);
  };

  const CapturedPieces = ({ pieces, color }: { pieces: PieceType[], color: Color }) => {
    const sortOrder = ['q', 'r', 'b', 'n', 'p'];
    const sorted = [...pieces].sort((a, b) => sortOrder.indexOf(a) - sortOrder.indexOf(b));

    return (
      <div className="flex flex-wrap gap-0.5 items-center min-h-[24px]">
        {sorted.map((type, idx) => (
          <span key={idx} className="text-lg md:text-xl" style={{
            color: color === 'w' ? '#f0f0f0' : '#2a2a2a',
            filter: color === 'w'
              ? 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))'
              : 'drop-shadow(0 1px 1px rgba(255,255,255,0.3))'
          }}>
            {pieceSymbols[color + type]}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-3 md:gap-6 items-start lg:items-center justify-center">

          {/* Left Panel - Game Info (Desktop) */}
          <div className="hidden lg:block lg:w-80 xl:w-96">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 xl:p-6 shadow-xl">
              <h1 className="text-xl xl:text-2xl font-bold text-white mb-4">Chess Game</h1>

              {/* Players */}
              <div className="space-y-3 mb-6">
                <div className={`bg-gray-700 rounded-lg p-3 xl:p-4 border-2 transition-all ${game.turn === 'b' ? 'border-green-500' : 'border-transparent'
                  }`}>
                  <div className="flex items-center gap-2 xl:gap-3 mb-2">
                    <div className="text-3xl xl:text-4xl">♚</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs xl:text-sm text-gray-400">Black</div>
                      <div className="font-semibold text-white text-sm xl:text-base truncate">
                        {game.playerNames.black || 'Waiting...'}
                        {playerColor === 'b' && <span className="text-green-400"> (You)</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CapturedPieces pieces={captured.white} color="w" />
                    {advantage < 0 && (
                      <span className="text-white font-bold text-sm">+{Math.abs(advantage)}</span>
                    )}
                  </div>
                </div>

                <div className={`bg-gray-700 rounded-lg p-3 xl:p-4 border-2 transition-all ${game.turn === 'w' ? 'border-green-500' : 'border-transparent'
                  }`}>
                  <div className="flex items-center gap-2 xl:gap-3 mb-2">
                    <div className="text-3xl xl:text-4xl">♔</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs xl:text-sm text-gray-400">White</div>
                      <div className="font-semibold text-white text-sm xl:text-base truncate">
                        {game.playerNames.white || 'Waiting...'}
                        {playerColor === 'w' && <span className="text-green-400"> (You)</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CapturedPieces pieces={captured.black} color="b" />
                    {advantage > 0 && (
                      <span className="text-white font-bold text-sm">+{advantage}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Game Status */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-400">Game ID:</span>
                  <span className="font-mono text-gray-300 text-xs">{id.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-400">Status:</span>
                  <span className="font-semibold text-green-400 capitalize">{game.status}</span>
                </div>
                {game.status === 'active' && (
                  <div className="flex justify-between py-2">
                    <span className="text-gray-400">Turn:</span>
                    <span className="font-semibold text-white text-xs xl:text-sm">
                      {game.turn === 'w' ? 'White' : 'Black'}
                      {game.turn === playerColor && ' (Your turn)'}
                    </span>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-4 bg-red-900/30 border border-red-700 rounded-lg p-3">
                  <p className="text-red-400 text-xs xl:text-sm">{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Center - Chess Board */}
          <div className="flex-1 flex flex-col items-center w-full">
            {/* Top Player (Mobile) - Black or opponent */}
            <div className="lg:hidden w-full max-w-md mb-2">
              <div className={`bg-gray-800 border ${game.turn === (playerColor === 'b' ? 'w' : 'b') ? 'border-green-500' : 'border-gray-700'
                } rounded-lg p-2 sm:p-3`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-2xl sm:text-3xl">{playerColor === 'b' ? '♔' : '♚'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-400">{playerColor === 'b' ? 'White' : 'Black'}</div>
                    <div className="font-semibold text-white text-sm truncate">
                      {playerColor === 'b' ? game.playerNames.white : game.playerNames.black}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CapturedPieces
                    pieces={playerColor === 'b' ? captured.black : captured.white}
                    color={playerColor === 'b' ? 'b' : 'w'}
                  />
                  {((playerColor === 'b' && advantage > 0) || (playerColor === 'w' && advantage < 0)) && (
                    <span className="text-white font-bold text-sm">
                      +{Math.abs(advantage)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Chess Board */}
            <div className="bg-gray-800 p-2 sm:p-3 md:p-4 rounded-xl shadow-2xl border-2 border-gray-700">
              <div className="inline-block border-2 sm:border-4 border-gray-900 rounded-lg overflow-hidden shadow-xl">
                {(playerColor === 'b' ? [...game.board].reverse() : game.board).map((row, displayRowIndex) => {
                  const rowIndex = playerColor === 'b' ? 7 - displayRowIndex : displayRowIndex;
                  return (
                    <div key={rowIndex} className="flex">
                      {(playerColor === 'b' ? [...row].reverse() : row).map((piece, displayColIndex) => {
                        const colIndex = playerColor === 'b' ? 7 - displayColIndex : displayColIndex;
                        const isLight = (rowIndex + colIndex) % 2 === 0;
                        const isSelected = selected?.row === rowIndex && selected?.col === colIndex;
                        const isValidMove = isValidMoveSquare(rowIndex, colIndex);
                        const isCapture = isValidMove && piece !== null;
                        const isLastMove = isLastMoveSquare(rowIndex, colIndex);

                        return (
                          <div
                            key={colIndex}
                            onClick={() => handleSquareClick(rowIndex, colIndex)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, rowIndex, colIndex)}
                            className={`w-10 h-10 xs:w-12 xs:h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 flex items-center justify-center text-3xl xs:text-4xl sm:text-5xl md:text-5xl lg:text-6xl transition-all cursor-pointer relative
                              ${isLight ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'}
                              ${isSelected ? 'ring-2 sm:ring-4 ring-inset ring-yellow-400' : ''}
                              ${isLastMove && !isSelected ? 'bg-opacity-70 ring-1 sm:ring-2 ring-inset ring-yellow-300' : ''}
                              hover:brightness-95 select-none`}
                          >
                            {/* Move indicator - lighter dots */}
                            {isValidMove && !piece && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 bg-gray-900 bg-opacity-15 rounded-full"></div>
                              </div>
                            )}

                            {/* Capture indicator */}
                            {isCapture && (
                              <div className="absolute inset-0 pointer-events-none">
                                <svg className="w-full h-full" viewBox="0 0 100 100">
                                  <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    fill="none"
                                    stroke="rgba(0, 0, 0, 0.12)"
                                    strokeWidth="6"
                                  />
                                </svg>
                              </div>
                            )}

                            {/* Chess Piece */}
                            {piece && (
                              <span
                                draggable={game.status === 'active' && piece.color === playerColor}
                                onDragStart={(e) => handleDragStart(e, rowIndex, colIndex)}
                                className={`cursor-move select-none drop-shadow-lg transition-transform hover:scale-110 z-10 ${piece.color === 'w' ? 'text-white' : 'text-gray-900'
                                  }`}
                                style={{
                                  filter: piece.color === 'w'
                                    ? 'drop-shadow(0 3px 3px rgba(0,0,0,0.9)) drop-shadow(0 1px 1px rgba(0,0,0,0.7))'
                                    : 'drop-shadow(0 3px 3px rgba(255,255,255,0.6)) drop-shadow(0 1px 1px rgba(255,255,255,0.4))'
                                }}
                              >
                                {pieceSymbols[piece.color + piece.type]}
                              </span>
                            )}

                            {/* Coordinate labels */}
                            {colIndex === (playerColor === 'b' ? 7 : 0) && (
                              <div className={`absolute left-0.5 sm:left-1 top-0.5 sm:top-1 text-[10px] sm:text-xs font-semibold pointer-events-none
                                ${isLight ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>
                                {8 - rowIndex}
                              </div>
                            )}
                            {rowIndex === (playerColor === 'b' ? 0 : 7) && (
                              <div className={`absolute right-0.5 sm:right-1 bottom-0 sm:bottom-0.5 text-[10px] sm:text-xs font-semibold pointer-events-none
                                ${isLight ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>
                                {String.fromCharCode(97 + colIndex)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Player (Mobile) - Current player */}
            <div className="lg:hidden w-full max-w-md mt-2">
              <div className={`bg-gray-800 border ${game.turn === playerColor ? 'border-green-500' : 'border-gray-700'
                } rounded-lg p-2 sm:p-3`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-2xl sm:text-3xl">{playerColor === 'w' ? '♔' : '♚'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-400">{playerColor === 'w' ? 'White' : 'Black'}</div>
                    <div className="font-semibold text-white text-sm truncate">
                      {playerColor === 'w' ? game.playerNames.white : game.playerNames.black}
                      <span className="text-green-400"> (You)</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CapturedPieces
                    pieces={playerColor === 'w' ? captured.black : captured.white}
                    color={playerColor === 'w' ? 'b' : 'w'}
                  />
                  {((playerColor === 'w' && advantage > 0) || (playerColor === 'b' && advantage < 0)) && (
                    <span className="text-white font-bold text-sm">
                      +{Math.abs(advantage)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Game Status (Mobile) */}
            {error && (
              <div className="lg:hidden w-full max-w-md mt-2 bg-red-900/30 border border-red-700 rounded-lg p-2">
                <p className="text-red-400 text-xs sm:text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

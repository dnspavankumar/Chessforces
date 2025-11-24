'use client';

import { use, useEffect, useState } from 'react';
import { Board, Color, Position } from '@/lib/chess';

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

export default function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [game, setGame] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [playerColor, setPlayerColor] = useState<Color | null>(null);
  const [selected, setSelected] = useState<Position | null>(null);
  const [error, setError] = useState('');
  const [dragFrom, setDragFrom] = useState<Position | null>(null);
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [username, setUsername] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    // Get or create player ID
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
        
        // Determine player color
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
    
    // Initial fetch
    fetchGame();
    
    // Check if we need to show username prompt
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
        setError('');
      }
    } else {
      if (row === selected.row && col === selected.col) {
        setSelected(null);
        return;
      }

      await makeMove(selected, { row, col });
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
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    
    if (!dragFrom) return;

    await makeMove(dragFrom, { row, col });
    setDragFrom(null);
  };

  if (!game) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-900">Loading game...</p>
        </div>
      </div>
    );
  }

  if (showUsernamePrompt && !playerColor) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-md mx-auto mt-20">
          <div className="border-2 border-gray-800 p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Join Game</h1>
            <p className="text-gray-700 mb-4">Enter your name to join this game:</p>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && joinGameWithUsername()}
              placeholder="Your name"
              className="w-full border border-gray-300 px-4 py-2 mb-4 text-gray-900"
              autoFocus
              disabled={isJoining}
            />
            {error && <p className="text-red-600 mb-4">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={joinGameWithUsername}
                disabled={!username.trim() || isJoining}
                className="flex-1 bg-blue-600 text-white px-6 py-2 hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              >
                {isJoining ? 'Joining...' : 'Join Game'}
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 bg-gray-300 text-gray-900 px-6 py-2 hover:bg-gray-400 transition-colors"
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
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Game Full</h1>
          <p className="text-gray-700 mb-4">This game already has two players:</p>
          <div className="bg-gray-100 p-4 mb-4 inline-block">
            <p className="text-gray-900">
              <span className="font-semibold">White:</span> {game.playerNames.white || 'Unknown'}
            </p>
            <p className="text-gray-900">
              <span className="font-semibold">Black:</span> {game.playerNames.black || 'Unknown'}
            </p>
          </div>
          <p className="text-gray-600 mb-4">You cannot join as a spectator.</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-6 py-2 hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Chess Game</h1>
          <div className="text-sm text-gray-700 space-y-1">
            <p>Game ID: <span className="font-mono bg-gray-100 px-2 py-1">{id}</span></p>
            <div className="bg-gray-100 p-3 my-2">
              <p>
                <span className="font-semibold">White:</span> {game.playerNames.white || 'Waiting...'}
                {playerColor === 'w' && ' (You)'}
              </p>
              <p>
                <span className="font-semibold">Black:</span> {game.playerNames.black || 'Waiting...'}
                {playerColor === 'b' && ' (You)'}
              </p>
            </div>
            <p>Status: <span className="font-semibold">{game.status}</span></p>
            {game.status === 'active' && (
              <p>Turn: <span className="font-semibold">{game.turn === 'w' ? 'White' : 'Black'}</span></p>
            )}
          </div>
          {error && <p className="text-red-600 mt-2">{error}</p>}
        </div>

        <div className="inline-block border-2 border-gray-800">
          {game.board.map((row, rowIndex) => (
            <div key={rowIndex} className="flex">
              {row.map((piece, colIndex) => {
                const isLight = (rowIndex + colIndex) % 2 === 0;
                const isSelected = selected?.row === rowIndex && selected?.col === colIndex;
                
                return (
                  <div
                    key={colIndex}
                    onClick={() => handleSquareClick(rowIndex, colIndex)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, rowIndex, colIndex)}
                    className={`w-16 h-16 flex items-center justify-center text-4xl transition-colors cursor-pointer
                      ${isLight ? 'bg-gray-200' : 'bg-gray-400'}
                      ${isSelected ? 'ring-4 ring-blue-500' : ''}
                      hover:opacity-80`}
                  >
                    {piece && (
                      <span
                        draggable={game.status === 'active' && piece.color === playerColor}
                        onDragStart={(e) => handleDragStart(e, rowIndex, colIndex)}
                        className="cursor-move select-none"
                      >
                        {pieceSymbols[piece.color + piece.type]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

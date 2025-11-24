'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [gameId, setGameId] = useState('');
  const router = useRouter();

  const createGame = async () => {
    const res = await fetch('/api/game/create', { method: 'POST' });
    const data = await res.json();
    router.push(`/game/${data.gameId}`);
  };

  const joinGame = () => {
    if (gameId.trim()) {
      router.push(`/game/${gameId}`);
    }
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Chess Game</h1>
        
        <div className="space-y-6">
          <div className="border border-gray-300 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Create New Game</h2>
            <button
              onClick={createGame}
              className="bg-blue-600 text-white px-6 py-2 hover:bg-blue-700 transition-colors"
            >
              Create Game
            </button>
          </div>

          <div className="border border-gray-300 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Join Existing Game</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && joinGame()}
                placeholder="Enter game ID"
                className="flex-1 border border-gray-300 px-4 py-2 text-gray-900"
              />
              <button
                onClick={joinGame}
                className="bg-green-600 text-white px-6 py-2 hover:bg-green-700 transition-colors"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

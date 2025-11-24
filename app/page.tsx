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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-7xl mb-4">♔</div>
          <h1 className="text-5xl font-bold text-white mb-3">Chess Game</h1>
          <p className="text-gray-400 text-lg">Play chess online with friends</p>
        </div>

        <div className="space-y-6">
          {/* Create Game Card */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 shadow-2xl hover:shadow-green-500/10 transition-all">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-green-600 rounded-lg p-3 text-3xl">
                ♟
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-white">Create New Game</h2>
                <p className="text-gray-400">Start a new chess match and invite a friend</p>
              </div>
            </div>
            <button
              onClick={createGame}
              className="w-full bg-green-600 text-white font-semibold text-lg px-8 py-4 rounded-lg hover:bg-green-700 transition-all hover:shadow-lg hover:shadow-green-500/30 transform hover:scale-[1.02]"
            >
              Create Game
            </button>
          </div>

          {/* Join Game Card */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 shadow-2xl hover:shadow-blue-500/10 transition-all">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-blue-600 rounded-lg p-3 text-3xl">
                🔗
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-white">Join Existing Game</h2>
                <p className="text-gray-400">Enter a game ID to join a match</p>
              </div>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && joinGame()}
                placeholder="Enter game ID"
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              />
              <button
                onClick={joinGame}
                disabled={!gameId.trim()}
                className="bg-blue-600 text-white font-semibold px-8 py-4 rounded-lg hover:bg-blue-700 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/30 transform hover:enabled:scale-[1.02] text-lg"
              >
                Join
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>Multiplayer Chess • Built with Next.js</p>
        </div>
      </div>
    </div>
  );
}

import { NextResponse } from 'next/server';
import { createGame } from '@/lib/db';

export async function POST() {
    const gameId = Math.random().toString(36).substring(7);
    const game = await createGame(gameId);
    return NextResponse.json({ gameId, game });
}

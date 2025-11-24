import { NextRequest, NextResponse } from 'next/server';
import { getGame, joinGame, updateGame } from '@/lib/db';
import { isValidMove, makeMove } from '@/lib/chess';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await getGame(id);
  
  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }
  
  return NextResponse.json(game);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { action, playerId, from, to } = body;

  if (action === 'join') {
    const { username } = body;
    if (!username || username.trim().length === 0) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }
    const result = await joinGame(id, playerId, username);
    if (!result) {
      return NextResponse.json({ error: 'Game is full' }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  if (action === 'move') {
    const game = await getGame(id);
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const playerColor = game.players.white === playerId ? 'w' : game.players.black === playerId ? 'b' : null;
    if (!playerColor || playerColor !== game.turn) {
      return NextResponse.json({ error: 'Not your turn' }, { status: 400 });
    }

    if (!isValidMove(game.board, from, to, game.turn)) {
      return NextResponse.json({ error: 'Invalid move' }, { status: 400 });
    }

    const newBoard = makeMove(game.board, from, to);
    const newTurn = game.turn === 'w' ? 'b' : 'w';
    
    const updated = await updateGame(id, { board: newBoard, turn: newTurn });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// Chess game logic
export type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
export type Color = 'w' | 'b';
export type Piece = { type: PieceType; color: Color } | null;
export type Board = Piece[][];
export type Position = { row: number; col: number };

export const initialBoard = (): Board => [
  [{ type: 'r', color: 'b' }, { type: 'n', color: 'b' }, { type: 'b', color: 'b' }, { type: 'q', color: 'b' }, { type: 'k', color: 'b' }, { type: 'b', color: 'b' }, { type: 'n', color: 'b' }, { type: 'r', color: 'b' }],
  [{ type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [{ type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }],
  [{ type: 'r', color: 'w' }, { type: 'n', color: 'w' }, { type: 'b', color: 'w' }, { type: 'q', color: 'w' }, { type: 'k', color: 'w' }, { type: 'b', color: 'w' }, { type: 'n', color: 'w' }, { type: 'r', color: 'w' }],
];

export const isValidMove = (board: Board, from: Position, to: Position, turn: Color): boolean => {
  const piece = board[from.row][from.col];
  if (!piece || piece.color !== turn) return false;
  if (to.row < 0 || to.row > 7 || to.col < 0 || to.col > 7) return false;

  const target = board[to.row][to.col];
  if (target && target.color === piece.color) return false;

  const rowDiff = to.row - from.row;
  const colDiff = to.col - from.col;

  switch (piece.type) {
    case 'p':
      const direction = piece.color === 'w' ? -1 : 1;
      const startRow = piece.color === 'w' ? 6 : 1;
      if (colDiff === 0 && !target) {
        if (rowDiff === direction) return true;
        if (from.row === startRow && rowDiff === 2 * direction && !board[from.row + direction][from.col]) return true;
      }
      if (Math.abs(colDiff) === 1 && rowDiff === direction && target) return true;
      return false;

    case 'r':
      if (rowDiff === 0 || colDiff === 0) {
        return isPathClear(board, from, to);
      }
      return false;

    case 'n':
      return (Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 1) || (Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 2);

    case 'b':
      if (Math.abs(rowDiff) === Math.abs(colDiff)) {
        return isPathClear(board, from, to);
      }
      return false;

    case 'q':
      if (rowDiff === 0 || colDiff === 0 || Math.abs(rowDiff) === Math.abs(colDiff)) {
        return isPathClear(board, from, to);
      }
      return false;

    case 'k':
      return Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1;

    default:
      return false;
  }
};

const isPathClear = (board: Board, from: Position, to: Position): boolean => {
  const rowStep = to.row > from.row ? 1 : to.row < from.row ? -1 : 0;
  const colStep = to.col > from.col ? 1 : to.col < from.col ? -1 : 0;
  let row = from.row + rowStep;
  let col = from.col + colStep;

  while (row !== to.row || col !== to.col) {
    if (board[row][col]) return false;
    row += rowStep;
    col += colStep;
  }
  return true;
};

export const makeMove = (board: Board, from: Position, to: Position): Board => {
  const newBoard = board.map(row => [...row]);
  newBoard[to.row][to.col] = newBoard[from.row][from.col];
  newBoard[from.row][from.col] = null;
  return newBoard;
};

export const getValidMoves = (board: Board, from: Position, turn: Color): Position[] => {
  const validMoves: Position[] = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const to = { row, col };
      if (isValidMove(board, from, to, turn)) {
        validMoves.push(to);
      }
    }
  }

  return validMoves;
};

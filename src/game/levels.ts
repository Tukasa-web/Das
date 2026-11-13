import { EnemyKind, StageDefinition, TileType } from './types';

const ROWS = 16;

function createEmptyGrid(cols: number): number[][] {
  return Array.from({ length: ROWS }, () => Array(cols).fill(TileType.Air));
}

function fillGround(grid: number[][], startCol: number, endCol: number, topRow = 14) {
  for (let c = startCol; c <= endCol; c++) {
    for (let r = topRow; r < ROWS; r++) {
      grid[r][c] = TileType.Ground;
    }
  }
}

function placePipe(grid: number[][], col: number, groundRow: number, height: number) {
  const topRow = groundRow - height;
  grid[topRow][col] = TileType.PipeTopLeft;
  grid[topRow][col + 1] = TileType.PipeTopRight;
  for (let r = topRow + 1; r < groundRow; r++) {
    grid[r][col] = TileType.PipeBodyLeft;
    grid[r][col + 1] = TileType.PipeBodyRight;
  }
}

function placeStairs(
  grid: number[][],
  startCol: number,
  groundRow: number,
  height: number,
  ascending: boolean
) {
  for (let i = 0; i < height; i++) {
    const col = startCol + i;
    const h = ascending ? i + 1 : height - i;
    for (let r = groundRow - h; r < groundRow; r++) {
      grid[r][col] = TileType.HardBlock;
    }
  }
}

function placeRow(grid: number[][], row: number, startCol: number, pattern: TileType[]) {
  pattern.forEach((tile, idx) => {
    grid[row][startCol + idx] = tile;
  });
}

function buildStage1(): StageDefinition {
  const cols = 148;
  const grid = createEmptyGrid(cols);

  fillGround(grid, 0, 38);
  fillGround(grid, 41, 58);
  fillGround(grid, 62, 92);
  fillGround(grid, 96, 147);

  grid[10][12] = TileType.QuestionCoin;
  placeRow(grid, 10, 17, [
    TileType.Brick,
    TileType.QuestionPower,
    TileType.Brick,
    TileType.QuestionCoin,
    TileType.Brick,
  ]);
  grid[6][19] = TileType.QuestionCoin;

  placePipe(grid, 25, 14, 2);
  placePipe(grid, 33, 14, 3);

  grid[9][38] = TileType.HiddenOneUp;

  placeRow(grid, 10, 44, [TileType.Brick, TileType.QuestionCoin, TileType.Brick]);
  placeRow(grid, 6, 48, [TileType.Brick, TileType.Brick, TileType.QuestionStar, TileType.Brick]);

  placeRow(grid, 10, 58, [
    TileType.OneWayPlatform,
    TileType.OneWayPlatform,
    TileType.OneWayPlatform,
    TileType.OneWayPlatform,
    TileType.OneWayPlatform,
  ]);

  placeRow(grid, 10, 67, [
    TileType.Brick,
    TileType.Brick,
    TileType.QuestionPower,
    TileType.Brick,
  ]);
  placeRow(grid, 6, 73, [
    TileType.Brick,
    TileType.Brick,
    TileType.Brick,
    TileType.QuestionCoin,
    TileType.Brick,
  ]);

  placePipe(grid, 82, 14, 3);
  placePipe(grid, 89, 14, 2);

  placeRow(grid, 10, 100, [
    TileType.Brick,
    TileType.Brick,
    TileType.QuestionCoin,
    TileType.Brick,
  ]);

  placeStairs(grid, 110, 14, 4, true);
  placeStairs(grid, 116, 14, 4, false);

  placeStairs(grid, 124, 14, 6, true);
  for (let r = 8; r < 14; r++) {
    grid[r][130] = TileType.HardBlock;
  }

  grid[13][136] = TileType.HardBlock;

  const coins: Array<{ tx: number; ty: number }> = [
    { tx: 14, ty: 12 },
    { tx: 15, ty: 12 },
    { tx: 38, ty: 11 },
    { tx: 39, ty: 10 },
    { tx: 40, ty: 10 },
    { tx: 41, ty: 11 },
    { tx: 59, ty: 8 },
    { tx: 60, ty: 8 },
    { tx: 61, ty: 8 },
    { tx: 74, ty: 4 },
    { tx: 75, ty: 4 },
    { tx: 76, ty: 4 },
    { tx: 105, ty: 12 },
    { tx: 106, ty: 12 },
    { tx: 107, ty: 12 },
  ];

  const enemies: Array<{ kind: EnemyKind; tx: number; ty: number }> = [
    { kind: 'goomba', tx: 16, ty: 13 },
    { kind: 'goomba', tx: 29, ty: 13 },
    { kind: 'koopa', tx: 46, ty: 13 },
    { kind: 'goomba', tx: 52, ty: 13 },
    { kind: 'goomba', tx: 54, ty: 13 },
    { kind: 'goomba', tx: 69, ty: 13 },
    { kind: 'koopa', tx: 75, ty: 5 },
    { kind: 'piranha', tx: 82, ty: 11 },
    { kind: 'goomba', tx: 99, ty: 13 },
    { kind: 'goomba', tx: 102, ty: 13 },
    { kind: 'koopa', tx: 115, ty: 13 },
  ];

  return {
    code: '1-1',
    name: 'みどりの草原',
    timeLimit: 300,
    cols,
    rows: ROWS,
    tiles: grid,
    coins,
    enemies,
    flagTx: 136,
    flagTopTy: 4,
    flagBottomTy: 13,
    castleTx: 141,
    spawnTx: 3,
    spawnTy: 12,
  };
}

export const STAGE_1_1: StageDefinition = buildStage1();

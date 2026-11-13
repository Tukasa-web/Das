export type GameStatus =
  | 'TITLE_MENU'
  | 'PLAYING'
  | 'PAUSED'
  | 'GAME_OVER'
  | 'VICTORY';

export type PowerState = 'small' | 'big' | 'fire';

export const TILE_SIZE = 32;
export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 512;

export enum TileType {
  Air = 0,
  Ground = 1,
  Brick = 2,
  QuestionCoin = 3,
  QuestionPower = 4,
  QuestionStar = 5,
  QuestionOneUp = 6,
  UsedBlock = 7,
  HardBlock = 8,
  PipeTopLeft = 9,
  PipeTopRight = 10,
  PipeBodyLeft = 11,
  PipeBodyRight = 12,
  OneWayPlatform = 13,
  HiddenOneUp = 14,
}

export interface TileBump {
  tx: number;
  ty: number;
  offsetY: number;
  vy: number;
}

export interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  onGround: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
  jumpHeld: boolean;
  power: PowerState;
  invincibleTimer: number;
  starTimer: number;
  fireCooldown: number;
  animTimer: number;
  animFrame: number;
  skidding: boolean;
  crouching: boolean;
  dead: boolean;
  deathTimer: number;
  stompCombo: number;
  pipeSlideState: 'none' | 'flag_slide' | 'walk_to_castle' | 'done';
  flagTargetY: number;
  castleTargetX: number;
}

export type EnemyKind = 'goomba' | 'koopa' | 'piranha';

export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  active: boolean;
  dead: boolean;
  squashedTimer: number;
  isShell: boolean;
  shellMoving: boolean;
  baseY: number;
  piranhaPhase: number;
  onGround: boolean;
}

export type ItemKind = 'mushroom' | 'fireflower' | 'star' | 'oneup';

export interface ItemEntity {
  id: number;
  kind: ItemKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  emergeY: number;
  emerging: boolean;
  collected: boolean;
}

export interface CoinEntity {
  id: number;
  x: number;
  y: number;
  collected: boolean;
}

export interface Fireball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  alive: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  gravity: number;
  spin?: number;
  angle?: number;
  kind: 'brick' | 'spark' | 'dust' | 'coin_pop' | 'firework';
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  vy: number;
}

export interface StageDefinition {
  code: string;
  name: string;
  timeLimit: number;
  cols: number;
  rows: number;
  tiles: number[][];
  coins: Array<{ tx: number; ty: number }>;
  enemies: Array<{ kind: EnemyKind; tx: number; ty: number }>;
  flagTx: number;
  flagTopTy: number;
  flagBottomTy: number;
  castleTx: number;
  spawnTx: number;
  spawnTy: number;
}

export interface HudSnapshot {
  status: GameStatus;
  score: number;
  highScore: number;
  coins: number;
  lives: number;
  timeLeft: number;
  stageCode: string;
  stageName: string;
  powerState: PowerState;
  lastTimeBonus: number;
  starActive: boolean;
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  dash: boolean;
  fire: boolean;
}

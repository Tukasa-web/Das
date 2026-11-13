import { audio } from './audio';
import { STAGE_1_1 } from './levels';
import {
  drawBackground,
  drawCoin,
  drawEnemy,
  drawFireball,
  drawFlagAndCastle,
  drawItem,
  drawPlayer,
  drawTile,
} from './sprites';
import {
  CoinEntity,
  Enemy,
  Fireball,
  FloatingText,
  GameStatus,
  HudSnapshot,
  InputState,
  ItemEntity,
  Particle,
  Player,
  PowerState,
  StageDefinition,
  TILE_SIZE,
  TileBump,
  TileType,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from './types';

const GRAVITY = 1950;
const JUMP_VELOCITY = -655;
const WALK_MAX_SPEED = 225;
const DASH_MAX_SPEED = 335;
const GROUND_ACCEL = 1550;
const AIR_ACCEL = 1050;
const GROUND_FRICTION = 1650;
const SKID_DECEL = 2300;
const COYOTE_TIME = 0.095;
const JUMP_BUFFER_TIME = 0.115;
const HIGH_SCORE_KEY = 'super_mushroom_dash_highscore_v1';

function isSolidTile(t: TileType): boolean {
  return (
    t === TileType.Ground ||
    t === TileType.Brick ||
    t === TileType.QuestionCoin ||
    t === TileType.QuestionPower ||
    t === TileType.QuestionStar ||
    t === TileType.QuestionOneUp ||
    t === TileType.UsedBlock ||
    t === TileType.HardBlock ||
    t === TileType.PipeTopLeft ||
    t === TileType.PipeTopRight ||
    t === TileType.PipeBodyLeft ||
    t === TileType.PipeBodyRight
  );
}

function isQuestionTile(t: TileType): boolean {
  return (
    t === TileType.QuestionCoin ||
    t === TileType.QuestionPower ||
    t === TileType.QuestionStar ||
    t === TileType.QuestionOneUp
  );
}

function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export class PlatformerEngine {
  private stage: StageDefinition = STAGE_1_1;
  private tiles: number[][] = [];
  private status: GameStatus = 'TITLE_MENU';

  private player!: Player;
  private enemies: Enemy[] = [];
  private items: ItemEntity[] = [];
  private coins: CoinEntity[] = [];
  private fireballs: Fireball[] = [];
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private bumps: TileBump[] = [];

  private score = 0;
  private highScore = 0;
  private coinCount = 0;
  private lives = 3;
  private timeLeft = 300;
  private lastTimeBonus = 0;

  private cameraX = 0;
  private worldTime = 0;
  private nextEntityId = 1;
  private prevJumpPressed = false;
  private prevFirePressed = false;
  private flagCurrentY = 0;
  private stageClearDelay = 0;
  private shellGraceTimers = new Map<number, number>();
  private hudEmitTimer = 0;

  private onHudChange: (snapshot: HudSnapshot) => void;

  constructor(onHudChange: (snapshot: HudSnapshot) => void) {
    this.onHudChange = onHudChange;
    try {
      const saved = window.localStorage.getItem(HIGH_SCORE_KEY);
      if (saved && /^\d{1,9}$/.test(saved)) {
        const parsed = Number.parseInt(saved, 10);
        if (Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 99_999_999) {
          this.highScore = parsed;
        }
      }
    } catch {
      // ignore
    }
    this.loadStage('small');
    this.status = 'TITLE_MENU';
    this.emitHud();
  }

  public getStatus(): GameStatus {
    return this.status;
  }

  public startNewGame() {
    audio.unlock();
    this.score = 0;
    this.coinCount = 0;
    this.lives = 3;
    this.lastTimeBonus = 0;
    this.loadStage('small');
    this.status = 'PLAYING';
    audio.startBgm();
    this.emitHud();
  }

  public restartStage() {
    audio.unlock();
    this.loadStage('small');
    this.status = 'PLAYING';
    audio.startBgm();
    this.emitHud();
  }

  public togglePause() {
    if (this.status === 'PLAYING') {
      this.status = 'PAUSED';
      audio.stopBgm();
      this.emitHud();
    } else if (this.status === 'PAUSED') {
      this.status = 'PLAYING';
      audio.startBgm();
      this.emitHud();
    }
  }

  public returnToTitle() {
    audio.stopBgm();
    this.loadStage('small');
    this.status = 'TITLE_MENU';
    this.emitHud();
  }

  private loadStage(power: PowerState) {
    this.stage = STAGE_1_1;
    this.tiles = this.stage.tiles.map((row) => [...row]);

    const h = power === 'small' ? 30 : 46;
    const spawnY = this.stage.spawnTy * TILE_SIZE + (TILE_SIZE - h);

    this.player = {
      x: this.stage.spawnTx * TILE_SIZE,
      y: spawnY,
      w: 24,
      h,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: false,
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      jumpHeld: false,
      power,
      invincibleTimer: 0,
      starTimer: 0,
      fireCooldown: 0,
      animTimer: 0,
      animFrame: 0,
      skidding: false,
      crouching: false,
      dead: false,
      deathTimer: 0,
      stompCombo: 0,
      pipeSlideState: 'none',
      flagTargetY: this.stage.flagBottomTy * TILE_SIZE - h,
      castleTargetX: this.stage.castleTx * TILE_SIZE + 48,
    };

    this.enemies = this.stage.enemies.map((e) => {
      const isKoopa = e.kind === 'koopa';
      const isPiranha = e.kind === 'piranha';
      const eh = isKoopa || isPiranha ? 36 : 28;
      return {
        id: this.nextEntityId++,
        kind: e.kind,
        x: e.tx * TILE_SIZE + (isPiranha ? 18 : 2),
        y: e.ty * TILE_SIZE + (TILE_SIZE - eh),
        w: 28,
        h: eh,
        vx: isPiranha ? 0 : -68,
        vy: 0,
        facing: -1,
        active: false,
        dead: false,
        squashedTimer: 0,
        isShell: false,
        shellMoving: false,
        baseY: isPiranha ? e.ty * TILE_SIZE : e.ty * TILE_SIZE + (TILE_SIZE - eh),
        piranhaPhase: (e.tx % 3) * 1.1,
        onGround: false,
      };
    });

    this.coins = this.stage.coins.map((c) => ({
      id: this.nextEntityId++,
      x: c.tx * TILE_SIZE,
      y: c.ty * TILE_SIZE,
      collected: false,
    }));

    this.items = [];
    this.fireballs = [];
    this.particles = [];
    this.floatingTexts = [];
    this.bumps = [];
    this.shellGraceTimers.clear();
    this.timeLeft = this.stage.timeLimit;
    this.cameraX = 0;
    this.flagCurrentY = this.stage.flagTopTy * TILE_SIZE + 8;
    this.stageClearDelay = 0;
  }

  private addScore(points: number, worldX?: number, worldY?: number, label?: string) {
    this.score += points;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        window.localStorage.setItem(HIGH_SCORE_KEY, String(this.highScore));
      } catch {
        // ignore
      }
    }
    if (worldX !== undefined && worldY !== undefined) {
      this.floatingTexts.push({
        x: worldX,
        y: worldY,
        text: label ?? `+${points}`,
        color: '#FEF08A',
        life: 0.75,
        vy: -52,
      });
    }
  }

  private grantCoin(worldX: number, worldY: number) {
    this.coinCount += 1;
    this.addScore(200, worldX, worldY, '+200');
    audio.playSfx('coin');
    if (this.coinCount >= 100) {
      this.coinCount -= 100;
      this.lives += 1;
      audio.playSfx('oneup');
      this.floatingTexts.push({
        x: worldX,
        y: worldY - 18,
        text: '1UP!',
        color: '#4ADE80',
        life: 1.0,
        vy: -60,
      });
    }
  }

  private emitHud() {
    this.onHudChange({
      status: this.status,
      score: this.score,
      highScore: this.highScore,
      coins: this.coinCount,
      lives: this.lives,
      timeLeft: Math.ceil(this.timeLeft),
      stageCode: this.stage.code,
      stageName: this.stage.name,
      powerState: this.player.power,
      lastTimeBonus: this.lastTimeBonus,
      starActive: this.player.starTimer > 0,
    });
  }

  public update(dt: number, input: InputState) {
    this.worldTime += dt;

    if (this.status === 'TITLE_MENU') {
      const maxCam = this.stage.cols * TILE_SIZE - VIEW_WIDTH;
      this.cameraX = ((Math.sin(this.worldTime * 0.14 - Math.PI / 2) + 1) / 2) * Math.min(maxCam, 900);
      return;
    }

    if (this.status !== 'PLAYING') {
      return;
    }

    for (let i = this.bumps.length - 1; i >= 0; i--) {
      const b = this.bumps[i];
      b.offsetY += b.vy * dt;
      b.vy += 900 * dt;
      if (b.offsetY >= 0) {
        this.bumps.splice(i, 1);
      }
    }

    this.updateParticles(dt);

    if (this.player.dead) {
      this.player.deathTimer -= dt;
      this.player.vy += GRAVITY * 0.85 * dt;
      this.player.y += this.player.vy * dt;
      if (this.player.deathTimer <= 0) {
        this.lives -= 1;
        if (this.lives <= 0) {
          this.status = 'GAME_OVER';
          audio.stopBgm();
          this.emitHud();
        } else {
          this.loadStage('small');
          audio.startBgm();
          this.emitHud();
        }
      }
      return;
    }

    if (this.player.pipeSlideState !== 'none') {
      this.updateGoalSequence(dt);
      return;
    }

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.triggerPlayerDeath();
      return;
    }

    this.updatePlayer(dt, input);

    const maxCamX = this.stage.cols * TILE_SIZE - VIEW_WIDTH;
    const targetCamX = Math.max(0, Math.min(maxCamX, this.player.x - VIEW_WIDTH * 0.38));
    this.cameraX += (targetCamX - this.cameraX) * Math.min(1, dt * 10);

    this.updateItems(dt);
    this.updateEnemies(dt);
    this.updateFireballs(dt);
    this.updateWorldCoins();

    const flagX = this.stage.flagTx * TILE_SIZE + 10;
    const flagTop = this.stage.flagTopTy * TILE_SIZE;
    const flagBot = this.stage.flagBottomTy * TILE_SIZE;
    if (
      rectsOverlap(
        this.player.x,
        this.player.y,
        this.player.w,
        this.player.h,
        flagX,
        flagTop,
        14,
        flagBot - flagTop
      )
    ) {
      this.beginGoalSequence();
    }

    this.hudEmitTimer += dt;
    if (this.hudEmitTimer >= 0.1) {
      this.hudEmitTimer = 0;
      this.emitHud();
    }
  }

  private updatePlayer(dt: number, input: InputState) {
    const p = this.player;

    if (p.invincibleTimer > 0) p.invincibleTimer = Math.max(0, p.invincibleTimer - dt);
    if (p.starTimer > 0) p.starTimer = Math.max(0, p.starTimer - dt);
    if (p.fireCooldown > 0) p.fireCooldown = Math.max(0, p.fireCooldown - dt);

    p.crouching = (p.power === 'big' || p.power === 'fire') && p.onGround && input.down;

    const maxSpeed = input.dash ? DASH_MAX_SPEED : WALK_MAX_SPEED;
    let moveDir = 0;
    if (!p.crouching) {
      if (input.left) moveDir -= 1;
      if (input.right) moveDir += 1;
    }

    p.skidding = false;
    if (moveDir !== 0) {
      p.facing = moveDir as 1 | -1;
      const reversing = (moveDir > 0 && p.vx < -25) || (moveDir < 0 && p.vx > 25);
      if (reversing && p.onGround) {
        p.skidding = true;
        p.vx += moveDir * SKID_DECEL * dt;
        if (Math.random() < 0.35) {
          this.spawnDust(p.x + p.w / 2, p.y + p.h);
        }
      } else {
        const accel = p.onGround ? GROUND_ACCEL : AIR_ACCEL;
        p.vx += moveDir * accel * dt;
      }
      if (Math.abs(p.vx) > maxSpeed) {
        p.vx = Math.sign(p.vx) * maxSpeed;
      }
    } else {
      const decel = p.onGround ? GROUND_FRICTION : GROUND_FRICTION * 0.35;
      if (Math.abs(p.vx) <= decel * dt) {
        p.vx = 0;
      } else {
        p.vx -= Math.sign(p.vx) * decel * dt;
      }
    }

    if (p.onGround) {
      p.coyoteTimer = COYOTE_TIME;
      p.stompCombo = 0;
    } else {
      p.coyoteTimer = Math.max(0, p.coyoteTimer - dt);
    }

    const jumpJustPressed = input.jump && !this.prevJumpPressed;
    this.prevJumpPressed = input.jump;
    if (jumpJustPressed) {
      p.jumpBufferTimer = JUMP_BUFFER_TIME;
    } else {
      p.jumpBufferTimer = Math.max(0, p.jumpBufferTimer - dt);
    }

    if (p.jumpBufferTimer > 0 && p.coyoteTimer > 0) {
      p.vy = JUMP_VELOCITY;
      p.onGround = false;
      p.coyoteTimer = 0;
      p.jumpBufferTimer = 0;
      p.jumpHeld = true;
      audio.playSfx(p.power === 'small' ? 'jump' : 'jump_big');
      this.spawnDust(p.x + p.w / 2, p.y + p.h);
    }

    if (!input.jump) {
      p.jumpHeld = false;
    }

    const firePressed = input.fire && !this.prevFirePressed;
    this.prevFirePressed = input.fire;
    if (firePressed && p.power === 'fire' && p.fireCooldown <= 0 && this.fireballs.length < 3) {
      p.fireCooldown = 0.22;
      audio.playSfx('fireball');
      this.fireballs.push({
        id: this.nextEntityId++,
        x: p.facing === 1 ? p.x + p.w : p.x - 10,
        y: p.y + 16,
        vx: p.facing * 430,
        vy: 80,
        life: 2.2,
        alive: true,
      });
    }

    let gravityScale = 1;
    if (p.vy < 0 && p.jumpHeld) {
      gravityScale = 0.56;
    } else if (p.vy < 0 && !p.jumpHeld) {
      gravityScale = 1.65;
    } else if (p.vy > 0) {
      gravityScale = 1.15;
    }

    p.vy = Math.min(920, p.vy + GRAVITY * gravityScale * dt);

    p.x += p.vx * dt;
    p.x = Math.max(0, Math.min(this.stage.cols * TILE_SIZE - p.w, p.x));
    this.resolveHorizontalTileCollisions(p);

    const prevBottom = p.y + p.h;
    p.y += p.vy * dt;
    p.onGround = false;
    this.resolveVerticalTileCollisions(p, prevBottom);

    if (p.onGround && Math.abs(p.vx) > 20) {
      p.animTimer += dt * (Math.abs(p.vx) / 140);
      if (p.animTimer >= 0.14) {
        p.animTimer = 0;
        p.animFrame = (p.animFrame + 1) % 3;
      }
    } else {
      p.animFrame = 0;
    }

    if (p.y > this.stage.rows * TILE_SIZE + 48) {
      this.triggerPlayerDeath();
    }
  }

  private resolveHorizontalTileCollisions(entity: {
    x: number;
    y: number;
    w: number;
    h: number;
    vx: number;
  }): boolean {
    let hitWall = false;
    const leftCol = Math.floor(entity.x / TILE_SIZE);
    const rightCol = Math.floor((entity.x + entity.w - 0.01) / TILE_SIZE);
    const topRow = Math.floor((entity.y + 2) / TILE_SIZE);
    const bottomRow = Math.floor((entity.y + entity.h - 2) / TILE_SIZE);

    for (let r = topRow; r <= bottomRow; r++) {
      if (r < 0 || r >= this.stage.rows) continue;
      for (let c = leftCol; c <= rightCol; c++) {
        if (c < 0 || c >= this.stage.cols) continue;
        if (isSolidTile(this.tiles[r][c])) {
          if (entity.vx > 0) {
            entity.x = c * TILE_SIZE - entity.w;
            entity.vx = 0;
            hitWall = true;
          } else if (entity.vx < 0) {
            entity.x = (c + 1) * TILE_SIZE;
            entity.vx = 0;
            hitWall = true;
          }
        }
      }
    }
    return hitWall;
  }

  private resolveVerticalTileCollisions(player: Player, prevBottom: number) {
    const leftCol = Math.floor((player.x + 2) / TILE_SIZE);
    const rightCol = Math.floor((player.x + player.w - 2) / TILE_SIZE);
    const topRow = Math.floor(player.y / TILE_SIZE);
    const bottomRow = Math.floor((player.y + player.h - 0.01) / TILE_SIZE);

    if (player.vy >= 0) {
      for (let c = leftCol; c <= rightCol; c++) {
        if (c < 0 || c >= this.stage.cols) continue;
        for (let r = topRow; r <= bottomRow; r++) {
          if (r < 0 || r >= this.stage.rows) continue;
          const tile = this.tiles[r][c];
          const tileTop = r * TILE_SIZE;
          if (isSolidTile(tile)) {
            player.y = tileTop - player.h;
            player.vy = 0;
            player.onGround = true;
            return;
          }
          if (tile === TileType.OneWayPlatform && prevBottom <= tileTop + 8) {
            player.y = tileTop - player.h;
            player.vy = 0;
            player.onGround = true;
            return;
          }
        }
      }
    } else {
      const headRow = Math.floor(player.y / TILE_SIZE);
      if (headRow >= 0 && headRow < this.stage.rows) {
        const centerCol = Math.floor((player.x + player.w / 2) / TILE_SIZE);
        const overlappingCols: number[] = [];
        for (let c = leftCol; c <= rightCol; c++) {
          if (c < 0 || c >= this.stage.cols) continue;
          const tile = this.tiles[headRow][c];
          if (isSolidTile(tile) || tile === TileType.HiddenOneUp) {
            overlappingCols.push(c);
          }
        }

        if (overlappingCols.length > 0) {
          if (overlappingCols.length === 1) {
            const c = overlappingCols[0];
            const tileLeft = c * TILE_SIZE;
            const tileRight = tileLeft + TILE_SIZE;
            if (player.x + player.w - tileLeft <= 7) {
              player.x = tileLeft - player.w - 0.5;
              return;
            }
            if (tileRight - player.x <= 7) {
              player.x = tileRight + 0.5;
              return;
            }
          }

          player.y = (headRow + 1) * TILE_SIZE;
          player.vy = 40;

          const hitCol = overlappingCols.includes(centerCol) ? centerCol : overlappingCols[0];
          this.handleBlockHitFromBelow(hitCol, headRow);
        }
      }
    }
  }

  private handleBlockHitFromBelow(tx: number, ty: number) {
    const tile = this.tiles[ty][tx];
    const worldX = tx * TILE_SIZE;
    const worldY = ty * TILE_SIZE;

    for (const e of this.enemies) {
      if (!e.dead && e.active && e.kind !== 'piranha') {
        if (rectsOverlap(e.x, e.y, e.w, e.h + 4, worldX, worldY - 8, TILE_SIZE, 12)) {
          e.dead = true;
          e.vy = -320;
          e.vx = (e.x < worldX ? -1 : 1) * 110;
          this.addScore(100, e.x, e.y - 8);
        }
      }
    }

    if (tile === TileType.Brick) {
      if (this.player.power === 'big' || this.player.power === 'fire') {
        this.tiles[ty][tx] = TileType.Air;
        audio.playSfx('brick_break');
        this.addScore(50);
        this.spawnBrickShards(worldX, worldY);
      } else {
        audio.playSfx('bump');
        this.addBump(tx, ty);
      }
      return;
    }

    if (isQuestionTile(tile) || tile === TileType.HiddenOneUp) {
      this.tiles[ty][tx] = TileType.UsedBlock;
      this.addBump(tx, ty);

      if (tile === TileType.QuestionCoin) {
        this.grantCoin(worldX + 8, worldY - 12);
        this.particles.push({
          x: worldX + 10,
          y: worldY - 10,
          vx: 0,
          vy: -380,
          size: 14,
          color: '#FACC15',
          life: 0.42,
          maxLife: 0.42,
          gravity: 1200,
          kind: 'coin_pop',
        });
      } else if (tile === TileType.QuestionPower) {
        audio.playSfx('powerup_appear');
        const kind = this.player.power === 'small' ? 'mushroom' : 'fireflower';
        this.spawnItem(kind, worldX + 2, worldY);
      } else if (tile === TileType.QuestionStar) {
        audio.playSfx('powerup_appear');
        this.spawnItem('star', worldX + 2, worldY);
      } else if (tile === TileType.QuestionOneUp || tile === TileType.HiddenOneUp) {
        audio.playSfx('powerup_appear');
        this.spawnItem('oneup', worldX + 2, worldY);
      }
      return;
    }

    audio.playSfx('bump');
  }

  private addBump(tx: number, ty: number) {
    this.bumps.push({ tx, ty, offsetY: -2, vy: -135 });
  }

  private spawnItem(kind: ItemEntity['kind'], x: number, blockY: number) {
    this.items.push({
      id: this.nextEntityId++,
      kind,
      x,
      y: blockY - 4,
      w: 28,
      h: 28,
      vx: kind === 'fireflower' ? 0 : 95,
      vy: 0,
      emergeY: blockY - 30,
      emerging: true,
      collected: false,
    });
  }

  private updateItems(dt: number) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      if (item.collected) {
        this.items.splice(i, 1);
        continue;
      }

      if (item.emerging) {
        item.y -= 70 * dt;
        if (item.y <= item.emergeY) {
          item.y = item.emergeY;
          item.emerging = false;
          if (item.kind === 'star') item.vy = -340;
        }
      } else if (item.kind !== 'fireflower') {
        item.vy = Math.min(720, item.vy + GRAVITY * 0.75 * dt);
        item.x += item.vx * dt;

        const oldVx = item.vx;
        if (this.resolveHorizontalTileCollisions(item)) {
          item.vx = -oldVx;
        }

        const prevBottom = item.y + item.h;
        item.y += item.vy * dt;
        const leftCol = Math.floor((item.x + 2) / TILE_SIZE);
        const rightCol = Math.floor((item.x + item.w - 2) / TILE_SIZE);
        const bottomRow = Math.floor((item.y + item.h - 0.01) / TILE_SIZE);

        if (item.vy >= 0 && bottomRow >= 0 && bottomRow < this.stage.rows) {
          for (let c = leftCol; c <= rightCol; c++) {
            if (c < 0 || c >= this.stage.cols) continue;
            const tile = this.tiles[bottomRow][c];
            const tileTop = bottomRow * TILE_SIZE;
            if (isSolidTile(tile) || (tile === TileType.OneWayPlatform && prevBottom <= tileTop + 8)) {
              item.y = tileTop - item.h;
              item.vy = item.kind === 'star' ? -410 : 0;
              break;
            }
          }
        }
      }

      if (
        rectsOverlap(
          this.player.x,
          this.player.y,
          this.player.w,
          this.player.h,
          item.x,
          item.y,
          item.w,
          item.h
        )
      ) {
        item.collected = true;
        if (item.kind === 'mushroom') {
          audio.playSfx('powerup');
          this.addScore(1000, item.x, item.y - 8, '+1000');
          if (this.player.power === 'small') {
            this.player.power = 'big';
            this.player.y -= 16;
            this.player.h = 46;
          }
        } else if (item.kind === 'fireflower') {
          audio.playSfx('powerup');
          this.addScore(1000, item.x, item.y - 8, '+1000');
          if (this.player.power === 'small') {
            this.player.y -= 16;
            this.player.h = 46;
          }
          this.player.power = 'fire';
        } else if (item.kind === 'star') {
          audio.playSfx('powerup');
          this.addScore(1000, item.x, item.y - 8, 'スター!');
          this.player.starTimer = 9.0;
        } else if (item.kind === 'oneup') {
          audio.playSfx('oneup');
          this.lives += 1;
          this.floatingTexts.push({
            x: item.x,
            y: item.y - 10,
            text: '1UP!',
            color: '#4ADE80',
            life: 1.0,
            vy: -58,
          });
        }
        this.emitHud();
      }

      if (item.y > this.stage.rows * TILE_SIZE + 64) {
        this.items.splice(i, 1);
      }
    }
  }

  private updateEnemies(dt: number) {
    for (const [id, t] of this.shellGraceTimers.entries()) {
      if (t - dt <= 0) this.shellGraceTimers.delete(id);
      else this.shellGraceTimers.set(id, t - dt);
    }

    const p = this.player;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      if (!e.active) {
        if (e.x < this.cameraX + VIEW_WIDTH + 140) {
          e.active = true;
        } else {
          continue;
        }
      }

      if (e.dead) {
        if (e.squashedTimer > 0) {
          e.squashedTimer -= dt;
          if (e.squashedTimer <= 0) this.enemies.splice(i, 1);
        } else {
          e.vy += GRAVITY * dt;
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          if (e.y > this.stage.rows * TILE_SIZE + 80) this.enemies.splice(i, 1);
        }
        continue;
      }

      if (e.kind === 'piranha') {
        e.piranhaPhase += dt * 1.9;
        const cycle = (Math.sin(e.piranhaPhase) + 1) / 2;
        const nearPipe = Math.abs(p.x + p.w / 2 - (e.x + e.w / 2)) < 36;
        const offset = nearPipe && cycle < 0.25 ? 0 : cycle * 34;
        e.y = e.baseY + TILE_SIZE - offset;
      } else {
        e.vy = Math.min(760, e.vy + GRAVITY * 0.85 * dt);
        const speed = e.isShell ? (e.shellMoving ? e.vx : 0) : e.vx;
        e.x += speed * dt;
        const oldVx = speed;
        if (this.resolveHorizontalTileCollisions(e)) {
          e.vx = -oldVx;
          e.facing = e.vx > 0 ? 1 : -1;
          if (e.isShell && e.shellMoving) {
            audio.playSfx('bump');
          }
        }

        const prevBottom = e.y + e.h;
        e.y += e.vy * dt;
        e.onGround = false;
        const leftCol = Math.floor((e.x + 2) / TILE_SIZE);
        const rightCol = Math.floor((e.x + e.w - 2) / TILE_SIZE);
        const bottomRow = Math.floor((e.y + e.h - 0.01) / TILE_SIZE);

        if (e.vy >= 0 && bottomRow >= 0 && bottomRow < this.stage.rows) {
          for (let c = leftCol; c <= rightCol; c++) {
            if (c < 0 || c >= this.stage.cols) continue;
            const tile = this.tiles[bottomRow][c];
            const tileTop = bottomRow * TILE_SIZE;
            if (
              isSolidTile(tile) ||
              (tile === TileType.OneWayPlatform && prevBottom <= tileTop + 8)
            ) {
              e.y = tileTop - e.h;
              e.vy = 0;
              e.onGround = true;
              break;
            }
          }
        }

        if (e.isShell && e.shellMoving) {
          for (const other of this.enemies) {
            if (other.id !== e.id && !other.dead && other.active) {
              if (rectsOverlap(e.x, e.y, e.w, e.h, other.x, other.y, other.w, other.h)) {
                other.dead = true;
                other.vy = -300;
                other.vx = Math.sign(e.vx) * 140;
                audio.playSfx('kick');
                this.addScore(200, other.x, other.y - 8);
              }
            }
          }
        }
      }

      if (e.y > this.stage.rows * TILE_SIZE + 80) {
        this.enemies.splice(i, 1);
        continue;
      }

      if (this.shellGraceTimers.has(e.id)) continue;

      if (rectsOverlap(p.x + 2, p.y + 2, p.w - 4, p.h - 2, e.x + 2, e.y + 2, e.w - 4, e.h - 2)) {
        if (p.starTimer > 0) {
          e.dead = true;
          e.vy = -340;
          e.vx = (e.x > p.x ? 1 : -1) * 160;
          audio.playSfx('kick');
          this.addScore(200, e.x, e.y - 8);
          continue;
        }

        const playerBottom = p.y + p.h;
        const canStomp = e.kind !== 'piranha' && p.vy > 0 && playerBottom - p.vy * dt <= e.y + 16;

        if (canStomp) {
          p.stompCombo += 1;
          const comboPoints = [100, 200, 400, 800, 1000];
          const pts = comboPoints[Math.min(p.stompCombo - 1, comboPoints.length - 1)];

          p.vy = p.jumpHeld ? -520 : -360;
          audio.playSfx('stomp');

          if (e.kind === 'goomba') {
            e.dead = true;
            e.squashedTimer = 0.35;
            this.addScore(pts, e.x, e.y - 10);
          } else if (e.kind === 'koopa') {
            if (!e.isShell) {
              e.isShell = true;
              e.shellMoving = false;
              e.h = 26;
              e.y += 10;
              e.vx = 0;
              this.addScore(pts, e.x, e.y - 10);
            } else if (e.shellMoving) {
              e.shellMoving = false;
              e.vx = 0;
              this.addScore(100, e.x, e.y - 10);
            } else {
              const dir = p.x + p.w / 2 < e.x + e.w / 2 ? 1 : -1;
              e.shellMoving = true;
              e.vx = dir * 420;
              this.shellGraceTimers.set(e.id, 0.16);
              audio.playSfx('kick');
              this.addScore(400, e.x, e.y - 10);
            }
          }
          continue;
        }

        if (e.isShell && !e.shellMoving) {
          const dir = p.x + p.w / 2 < e.x + e.w / 2 ? 1 : -1;
          e.shellMoving = true;
          e.vx = dir * 420;
          this.shellGraceTimers.set(e.id, 0.18);
          audio.playSfx('kick');
          this.addScore(400, e.x, e.y - 10);
          continue;
        }

        this.hurtPlayer();
      }
    }
  }

  private updateFireballs(dt: number) {
    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      const fb = this.fireballs[i];
      fb.life -= dt;
      if (fb.life <= 0 || !fb.alive) {
        this.fireballs.splice(i, 1);
        continue;
      }

      fb.vy = Math.min(540, fb.vy + GRAVITY * 0.72 * dt);
      fb.x += fb.vx * dt;

      const col = Math.floor((fb.x + 6) / TILE_SIZE);
      const row = Math.floor((fb.y + 6) / TILE_SIZE);
      if (col < 0 || col >= this.stage.cols || row >= this.stage.rows) {
        this.fireballs.splice(i, 1);
        continue;
      }
      if (row >= 0 && isSolidTile(this.tiles[row][col])) {
        this.spawnFireSparks(fb.x + 6, fb.y + 6);
        this.fireballs.splice(i, 1);
        continue;
      }

      fb.y += fb.vy * dt;
      const bRow = Math.floor((fb.y + 12) / TILE_SIZE);
      if (bRow >= 0 && bRow < this.stage.rows && col >= 0 && col < this.stage.cols) {
        const t = this.tiles[bRow][col];
        if (isSolidTile(t) || t === TileType.OneWayPlatform) {
          fb.y = bRow * TILE_SIZE - 12;
          fb.vy = -310;
        }
      }

      for (const e of this.enemies) {
        if (!e.dead && e.active && rectsOverlap(fb.x, fb.y, 12, 12, e.x, e.y, e.w, e.h)) {
          e.dead = true;
          e.vy = -290;
          e.vx = Math.sign(fb.vx) * 120;
          fb.alive = false;
          audio.playSfx('kick');
          this.spawnFireSparks(fb.x + 6, fb.y + 6);
          this.addScore(200, e.x, e.y - 8);
          break;
        }
      }
    }
  }

  private updateWorldCoins() {
    for (const c of this.coins) {
      if (c.collected) continue;
      if (
        rectsOverlap(
          this.player.x,
          this.player.y,
          this.player.w,
          this.player.h,
          c.x + 6,
          c.y + 4,
          20,
          24
        )
      ) {
        c.collected = true;
        this.grantCoin(c.x + 8, c.y);
        this.emitHud();
      }
    }
  }

  private hurtPlayer() {
    if (this.player.invincibleTimer > 0 || this.player.dead) return;
    if (this.player.power === 'big' || this.player.power === 'fire') {
      this.player.power = 'small';
      this.player.h = 30;
      this.player.y += 16;
      this.player.invincibleTimer = 1.6;
      audio.playSfx('hurt');
      this.emitHud();
    } else {
      this.triggerPlayerDeath();
    }
  }

  private triggerPlayerDeath() {
    if (this.player.dead) return;
    this.player.dead = true;
    this.player.vx = 0;
    this.player.vy = -520;
    this.player.deathTimer = 1.45;
    audio.stopBgm();
    audio.playSfx('death');
  }

  private beginGoalSequence() {
    const p = this.player;
    p.pipeSlideState = 'flag_slide';
    p.vx = 0;
    p.vy = 0;
    p.x = this.stage.flagTx * TILE_SIZE + 2;

    const topY = this.stage.flagTopTy * TILE_SIZE;
    const botY = this.stage.flagBottomTy * TILE_SIZE;
    const ratio = Math.max(0, Math.min(1, 1 - (p.y - topY) / Math.max(1, botY - topY)));
    const poleBonus = ratio > 0.85 ? 5000 : ratio > 0.6 ? 2000 : ratio > 0.35 ? 800 : 400;
    this.addScore(poleBonus, p.x, p.y - 12, `+${poleBonus}`);

    audio.stopBgm();
    audio.playSfx('flagpole');
  }

  private updateGoalSequence(dt: number) {
    const p = this.player;
    const flagBotY = this.stage.flagBottomTy * TILE_SIZE - 26;

    if (p.pipeSlideState === 'flag_slide') {
      const slideSpeed = 190;
      if (p.y < p.flagTargetY) {
        p.y = Math.min(p.flagTargetY, p.y + slideSpeed * dt);
      }
      if (this.flagCurrentY < flagBotY) {
        this.flagCurrentY = Math.min(flagBotY, this.flagCurrentY + slideSpeed * dt);
      }
      if (p.y >= p.flagTargetY && this.flagCurrentY >= flagBotY) {
        p.pipeSlideState = 'walk_to_castle';
        audio.playSfx('stage_clear');
      }
    } else if (p.pipeSlideState === 'walk_to_castle') {
      p.facing = 1;
      p.vx = 135;
      p.x += p.vx * dt;
      p.onGround = true;
      p.animTimer += dt;
      if (p.animTimer >= 0.12) {
        p.animTimer = 0;
        p.animFrame = (p.animFrame + 1) % 3;
      }
      if (p.x >= p.castleTargetX) {
        p.pipeSlideState = 'done';
        this.lastTimeBonus = Math.ceil(this.timeLeft) * 20;
        this.addScore(this.lastTimeBonus);
        this.stageClearDelay = 0.75;
        this.spawnFireworks(p.castleTargetX + 16, this.stage.flagTopTy * TILE_SIZE + 20);
      }
    } else if (p.pipeSlideState === 'done') {
      this.stageClearDelay -= dt;
      if (this.stageClearDelay <= 0) {
        this.status = 'VICTORY';
        this.emitHud();
      }
    }
  }

  private spawnDust(x: number, y: number) {
    this.particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y - 4,
      vx: (Math.random() - 0.5) * 45,
      vy: -25 - Math.random() * 25,
      size: 5,
      color: 'rgba(255,255,255,0.65)',
      life: 0.25,
      maxLife: 0.25,
      gravity: 0,
      kind: 'dust',
    });
  }

  private spawnBrickShards(wx: number, wy: number) {
    const dirs = [
      { vx: -120, vy: -380 },
      { vx: 120, vy: -380 },
      { vx: -85, vy: -240 },
      { vx: 85, vy: -240 },
    ];
    for (const d of dirs) {
      this.particles.push({
        x: wx + 12,
        y: wy + 12,
        vx: d.vx,
        vy: d.vy,
        size: 10,
        color: '#D97746',
        life: 0.9,
        maxLife: 0.9,
        gravity: 1400,
        spin: (Math.random() - 0.5) * 14,
        angle: 0,
        kind: 'brick',
      });
    }
  }

  private spawnFireSparks(wx: number, wy: number) {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      this.particles.push({
        x: wx,
        y: wy,
        vx: Math.cos(angle) * 120,
        vy: Math.sin(angle) * 120,
        size: 5,
        color: i % 2 === 0 ? '#FB923C' : '#FEF08A',
        life: 0.24,
        maxLife: 0.24,
        gravity: 200,
        kind: 'spark',
      });
    }
  }

  private spawnFireworks(wx: number, wy: number) {
    const colors = ['#FACC15', '#FB7185', '#38BDF8', '#4ADE80'];
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const spd = 80 + Math.random() * 140;
      this.particles.push({
        x: wx,
        y: wy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 60,
        size: 6,
        color: colors[i % colors.length],
        life: 0.75,
        maxLife: 0.75,
        gravity: 280,
        kind: 'firework',
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      pt.vy += pt.gravity * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.angle !== undefined && pt.spin !== undefined) {
        pt.angle += pt.spin * dt;
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }
      ft.y += ft.vy * dt;
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    drawBackground(ctx, this.cameraX, VIEW_WIDTH, VIEW_HEIGHT);

    ctx.save();
    ctx.translate(-Math.floor(this.cameraX), 0);

    for (const e of this.enemies) {
      if (e.kind === 'piranha' && !e.dead) {
        drawEnemy(ctx, e, this.worldTime);
      }
    }

    drawFlagAndCastle(
      ctx,
      this.stage.flagTx * TILE_SIZE,
      this.stage.flagTopTy * TILE_SIZE,
      this.stage.flagBottomTy * TILE_SIZE,
      this.flagCurrentY,
      this.stage.castleTx * TILE_SIZE,
      14 * TILE_SIZE
    );

    const startCol = Math.max(0, Math.floor(this.cameraX / TILE_SIZE) - 1);
    const endCol = Math.min(this.stage.cols - 1, Math.ceil((this.cameraX + VIEW_WIDTH) / TILE_SIZE) + 1);

    for (let r = 0; r < this.stage.rows; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const tile = this.tiles[r][c];
        if (tile === TileType.Air || tile === TileType.HiddenOneUp) continue;

        let offsetY = 0;
        for (const b of this.bumps) {
          if (b.tx === c && b.ty === r) {
            offsetY = b.offsetY;
            break;
          }
        }
        const isTopGround =
          tile === TileType.Ground && (r === 0 || this.tiles[r - 1][c] !== TileType.Ground);
        drawTile(
          ctx,
          tile,
          c * TILE_SIZE,
          r * TILE_SIZE + offsetY,
          this.worldTime,
          isTopGround
        );
      }
    }

    for (const c of this.coins) {
      if (!c.collected) {
        drawCoin(ctx, c.x, c.y, this.worldTime);
      }
    }

    for (const item of this.items) {
      if (!item.collected) {
        drawItem(ctx, item, this.worldTime);
      }
    }

    for (const e of this.enemies) {
      if (e.kind !== 'piranha' && e.active) {
        drawEnemy(ctx, e, this.worldTime);
      }
    }

    for (const fb of this.fireballs) {
      drawFireball(ctx, fb, this.worldTime);
    }

    if (this.player.pipeSlideState !== 'done') {
      drawPlayer(ctx, this.player, this.worldTime);
    }

    for (const pt of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      if (pt.kind === 'brick' && pt.angle !== undefined) {
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.angle);
        ctx.fillRect(-pt.size / 2, -pt.size / 2, pt.size, pt.size);
      } else {
        ctx.fillRect(Math.floor(pt.x), Math.floor(pt.y), pt.size, pt.size);
      }
      ctx.restore();
    }

    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    for (const ft of this.floatingTexts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, ft.life * 1.6));
      ctx.fillStyle = '#0F172A';
      ctx.fillText(ft.text, Math.floor(ft.x) + 13, Math.floor(ft.y) + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, Math.floor(ft.x) + 12, Math.floor(ft.y));
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }
}

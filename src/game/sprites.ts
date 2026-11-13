import {
  Enemy,
  Fireball,
  ItemEntity,
  Player,
  TILE_SIZE,
  TileType,
} from './types';

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  viewW: number,
  viewH: number
) {
  const grad = ctx.createLinearGradient(0, 0, 0, viewH);
  grad.addColorStop(0, '#4A88F5');
  grad.addColorStop(1, '#88C1FF');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, viewW, viewH);

  // Parallax clouds
  const cloudOffset = cameraX * 0.22;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  for (let i = 0; i < 8; i++) {
    const cx =
      (((i * 260 - cloudOffset) % (viewW + 240)) + viewW + 240) % (viewW + 240) - 120;
    const cy = 62 + (i % 3) * 44;
    ctx.fillRect(cx + 16, cy, 48, 22);
    ctx.fillRect(cx, cy + 8, 80, 18);
    ctx.fillRect(cx + 26, cy - 10, 28, 14);
  }

  // Far hills
  const farOffset = cameraX * 0.32;
  ctx.fillStyle = '#46A052';
  for (let i = -1; i < 7; i++) {
    const hx = i * 240 - (farOffset % 240);
    ctx.beginPath();
    ctx.arc(hx + 90, viewH - 64, 96, Math.PI, 0);
    ctx.fill();
  }

  // Near hills
  const nearOffset = cameraX * 0.5;
  ctx.fillStyle = '#2F823C';
  for (let i = -1; i < 8; i++) {
    const hx = i * 190 - (nearOffset % 190);
    ctx.beginPath();
    ctx.arc(hx + 65, viewH - 64, 58, Math.PI, 0);
    ctx.fill();
  }
}

export function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: TileType,
  x: number,
  y: number,
  time: number,
  isTopGround: boolean
) {
  const s = TILE_SIZE;

  switch (tile) {
    case TileType.Ground: {
      ctx.fillStyle = '#B85C2C';
      ctx.fillRect(x, y, s, s);
      if (isTopGround) {
        ctx.fillStyle = '#3DB843';
        ctx.fillRect(x, y, s, 8);
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(x, y, s, 2);
      }
      ctx.fillStyle = '#8C3F19';
      ctx.fillRect(x + 4, y + 12, 6, 4);
      ctx.fillRect(x + 18, y + 20, 8, 4);
      ctx.fillRect(x + 10, y + 26, 4, 4);
      break;
    }

    case TileType.Brick: {
      ctx.fillStyle = '#471C0B';
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = '#C85A2A';
      ctx.fillRect(x + 1, y + 1, 14, 13);
      ctx.fillRect(x + 17, y + 1, 14, 13);
      ctx.fillRect(x + 1, y + 16, 6, 15);
      ctx.fillRect(x + 9, y + 16, 14, 15);
      ctx.fillRect(x + 25, y + 16, 6, 15);
      ctx.fillStyle = '#EA8C55';
      ctx.fillRect(x + 1, y + 1, 14, 2);
      ctx.fillRect(x + 17, y + 1, 14, 2);
      ctx.fillRect(x + 9, y + 16, 14, 2);
      break;
    }

    case TileType.QuestionCoin:
    case TileType.QuestionPower:
    case TileType.QuestionStar:
    case TileType.QuestionOneUp: {
      const shimmer = Math.floor(time * 5) % 4;
      const faceColors = ['#F59E0B', '#FBBF24', '#FCD34D', '#FBBF24'];
      ctx.fillStyle = '#5C2804';
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = faceColors[shimmer];
      ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
      ctx.fillStyle = '#FEF3C7';
      ctx.fillRect(x + 2, y + 2, s - 4, 2);
      ctx.fillRect(x + 2, y + 2, 2, s - 4);
      ctx.fillStyle = '#92400E';
      ctx.fillRect(x + 4, y + 4, 2, 2);
      ctx.fillRect(x + s - 6, y + 4, 2, 2);
      ctx.fillRect(x + 4, y + s - 6, 2, 2);
      ctx.fillRect(x + s - 6, y + s - 6, 2, 2);
      ctx.fillStyle = '#5C2804';
      ctx.fillRect(x + 11, y + 8, 10, 3);
      ctx.fillRect(x + 18, y + 11, 4, 4);
      ctx.fillRect(x + 14, y + 14, 5, 4);
      ctx.fillRect(x + 14, y + 21, 4, 4);
      ctx.fillStyle = '#FFFBEB';
      ctx.fillRect(x + 10, y + 7, 10, 3);
      ctx.fillRect(x + 17, y + 10, 4, 4);
      ctx.fillRect(x + 13, y + 13, 5, 4);
      ctx.fillRect(x + 13, y + 20, 4, 4);
      break;
    }

    case TileType.UsedBlock: {
      ctx.fillStyle = '#2B1F1A';
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = '#6E5549';
      ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
      ctx.fillStyle = '#8C7062';
      ctx.fillRect(x + 2, y + 2, s - 4, 2);
      break;
    }

    case TileType.HardBlock: {
      ctx.fillStyle = '#592914';
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = '#A65B38';
      ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
      ctx.fillStyle = '#D9936A';
      ctx.fillRect(x + 2, y + 2, s - 4, 3);
      ctx.fillRect(x + 2, y + 2, 3, s - 4);
      ctx.fillStyle = '#592914';
      ctx.fillRect(x + 10, y + 10, 12, 12);
      ctx.fillStyle = '#A65B38';
      ctx.fillRect(x + 12, y + 12, 8, 8);
      break;
    }

    case TileType.PipeTopLeft: {
      ctx.fillStyle = '#0A2E0F';
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = '#2DB83D';
      ctx.fillRect(x + 2, y + 2, s - 2, s - 4);
      ctx.fillStyle = '#7CF26B';
      ctx.fillRect(x + 6, y + 2, 6, s - 4);
      ctx.fillRect(x + 2, y + 2, s - 2, 3);
      break;
    }

    case TileType.PipeTopRight: {
      ctx.fillStyle = '#0A2E0F';
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = '#2DB83D';
      ctx.fillRect(x, y + 2, s - 2, s - 4);
      ctx.fillStyle = '#166E20';
      ctx.fillRect(x + s - 10, y + 2, 8, s - 4);
      ctx.fillStyle = '#7CF26B';
      ctx.fillRect(x, y + 2, s - 10, 3);
      break;
    }

    case TileType.PipeBodyLeft: {
      ctx.fillStyle = '#0A2E0F';
      ctx.fillRect(x + 3, y, s - 3, s);
      ctx.fillStyle = '#2DB83D';
      ctx.fillRect(x + 5, y, s - 5, s);
      ctx.fillStyle = '#7CF26B';
      ctx.fillRect(x + 9, y, 6, s);
      break;
    }

    case TileType.PipeBodyRight: {
      ctx.fillStyle = '#0A2E0F';
      ctx.fillRect(x, y, s - 3, s);
      ctx.fillStyle = '#2DB83D';
      ctx.fillRect(x, y, s - 5, s);
      ctx.fillStyle = '#166E20';
      ctx.fillRect(x + s - 13, y, 8, s);
      break;
    }

    case TileType.OneWayPlatform: {
      ctx.fillStyle = '#4A2B11';
      ctx.fillRect(x, y, s, 10);
      ctx.fillStyle = '#D98E43';
      ctx.fillRect(x + 1, y + 2, s - 2, 6);
      ctx.fillStyle = '#F7C47E';
      ctx.fillRect(x + 2, y + 2, s - 4, 2);
      break;
    }

    default:
      break;
  }
}

export function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const widths = [16, 10, 4, 10];
  const w = widths[Math.floor(time * 8) % 4];
  const cx = Math.floor(x + (TILE_SIZE - w) / 2);
  const cy = Math.floor(y + 5);
  const h = 22;

  ctx.fillStyle = '#78350F';
  ctx.fillRect(cx - 1, cy - 1, w + 2, h + 2);
  ctx.fillStyle = '#FBBF24';
  ctx.fillRect(cx, cy, w, h);
  if (w >= 10) {
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(cx + 2, cy + 2, 2, h - 4);
    ctx.fillStyle = '#B45309';
    ctx.fillRect(cx + Math.floor(w / 2) - 1, cy + 5, 2, h - 10);
  }
}

export function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, time: number) {
  if (player.invincibleTimer > 0 && Math.floor(time * 20) % 2 === 0 && !player.dead) {
    return;
  }

  const isBig = player.power === 'big' || player.power === 'fire';
  const isFire = player.power === 'fire';

  const rainbow = ['#EF4444', '#F59E0B', '#10B981', '#38BDF8', '#A855F7'];
  const starColor = rainbow[Math.floor(time * 18) % rainbow.length];

  const hatColor = player.starTimer > 0 ? starColor : isFire ? '#FFFBEB' : '#E11D48';
  const shirtColor = player.starTimer > 0 ? '#FEF08A' : isFire ? '#E11D48' : '#2563EB';
  const overallColor = player.starTimer > 0 ? starColor : isFire ? '#DC2626' : '#1D4ED8';
  const skinColor = '#FDBA74';
  const hairColor = '#451A03';
  const shoeColor = '#78350F';

  const drawH = player.crouching && isBig ? 32 : player.h;
  const drawY = player.crouching && isBig ? player.y + (player.h - 32) : player.y;

  ctx.save();
  ctx.translate(player.x + player.w / 2, drawY + drawH / 2);
  ctx.scale(player.facing, 1);
  ctx.translate(-player.w / 2, -drawH / 2);

  const w = player.w;
  const h = drawH;

  if (!isBig || (player.crouching && isBig)) {
    ctx.fillStyle = hatColor;
    ctx.fillRect(4, 0, w - 8, 6);
    ctx.fillRect(3, 4, w - 4, 4);
    ctx.fillStyle = hairColor;
    ctx.fillRect(3, 8, 5, 6);
    ctx.fillStyle = skinColor;
    ctx.fillRect(8, 8, w - 11, 9);
    ctx.fillStyle = '#111827';
    ctx.fillRect(w - 9, 9, 3, 4);
    ctx.fillStyle = hairColor;
    ctx.fillRect(w - 11, 14, 9, 2);
    ctx.fillStyle = shirtColor;
    ctx.fillRect(4, 17, w - 8, 7);
    ctx.fillStyle = overallColor;
    ctx.fillRect(6, 17, w - 12, 8);
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(8, 19, 2, 2);
    ctx.fillRect(w - 10, 19, 2, 2);

    ctx.fillStyle = shoeColor;
    if (!player.onGround && !player.dead) {
      ctx.fillRect(3, h - 6, 8, 6);
      ctx.fillRect(w - 10, h - 8, 8, 6);
    } else if (Math.abs(player.vx) > 20) {
      const stride = player.animFrame === 1 ? 3 : player.animFrame === 2 ? -3 : 0;
      ctx.fillRect(4 + stride, h - 5, 8, 5);
      ctx.fillRect(w - 12 - stride, h - 5, 8, 5);
    } else {
      ctx.fillRect(4, h - 5, 8, 5);
      ctx.fillRect(w - 12, h - 5, 8, 5);
    }
  } else {
    ctx.fillStyle = hatColor;
    ctx.fillRect(4, 0, w - 8, 7);
    ctx.fillRect(3, 5, w - 3, 4);
    ctx.fillStyle = hairColor;
    ctx.fillRect(3, 9, 6, 8);
    ctx.fillStyle = skinColor;
    ctx.fillRect(8, 9, w - 10, 13);
    ctx.fillStyle = '#111827';
    ctx.fillRect(w - 9, 11, 3, 5);
    ctx.fillStyle = hairColor;
    ctx.fillRect(w - 12, 18, 10, 3);
    ctx.fillStyle = shirtColor;
    ctx.fillRect(3, 22, w - 6, 12);
    ctx.fillStyle = overallColor;
    ctx.fillRect(6, 23, w - 12, 16);
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(8, 26, 3, 3);
    ctx.fillRect(w - 11, 26, 3, 3);
    ctx.fillStyle = '#FFFFFF';
    if (!player.onGround) {
      ctx.fillRect(w - 4, 15, 5, 5);
      ctx.fillRect(0, 27, 5, 5);
    } else {
      ctx.fillRect(1, 29, 5, 5);
      ctx.fillRect(w - 6, 29, 5, 5);
    }
    ctx.fillStyle = shoeColor;
    if (!player.onGround) {
      ctx.fillRect(3, h - 7, 9, 7);
      ctx.fillRect(w - 11, h - 10, 9, 7);
    } else if (Math.abs(player.vx) > 20) {
      const stride = player.animFrame === 1 ? 4 : player.animFrame === 2 ? -4 : 0;
      ctx.fillRect(3 + stride, h - 6, 9, 6);
      ctx.fillRect(w - 12 - stride, h - 6, 9, 6);
    } else {
      ctx.fillRect(4, h - 6, 9, 6);
      ctx.fillRect(w - 13, h - 6, 9, 6);
    }
  }

  ctx.restore();
}

export function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number) {
  const x = Math.floor(enemy.x);
  const y = Math.floor(enemy.y);
  const w = enemy.w;
  const h = enemy.h;

  if (enemy.kind === 'goomba') {
    if (enemy.dead && enemy.squashedTimer > 0) {
      ctx.fillStyle = '#7C2D12';
      ctx.fillRect(x, y + h - 10, w, 8);
      ctx.fillStyle = '#FED7AA';
      ctx.fillRect(x + 6, y + h - 4, w - 12, 4);
      return;
    }
    ctx.fillStyle = '#9A3412';
    ctx.fillRect(x + 4, y, w - 8, 6);
    ctx.fillRect(x + 1, y + 5, w - 2, 12);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + 6, y + 8, 5, 6);
    ctx.fillRect(x + w - 11, y + 8, 5, 6);
    ctx.fillStyle = '#111827';
    ctx.fillRect(x + 8, y + 10, 3, 4);
    ctx.fillRect(x + w - 11, y + 10, 3, 4);
    ctx.fillRect(x + 5, y + 7, 6, 2);
    ctx.fillRect(x + w - 11, y + 7, 6, 2);
    ctx.fillStyle = '#FFEDD5';
    ctx.fillRect(x + 7, y + 17, w - 14, 9);
    const step = Math.floor(time * 8) % 2 === 0 ? 0 : 2;
    ctx.fillStyle = '#431407';
    ctx.fillRect(x + 3 + step, y + h - 6, 10, 6);
    ctx.fillRect(x + w - 13 - step, y + h - 6, 10, 6);
    return;
  }

  if (enemy.kind === 'koopa') {
    if (enemy.isShell) {
      ctx.fillStyle = '#14532D';
      ctx.fillRect(x + 2, y + 4, w - 4, h - 6);
      ctx.fillStyle = '#22C55E';
      ctx.fillRect(x + 4, y + 6, w - 8, h - 12);
      ctx.fillStyle = '#DCFCE7';
      ctx.fillRect(x + 6, y + 8, w - 12, 4);
      ctx.fillStyle = '#FEF3C7';
      ctx.fillRect(x + 3, y + h - 6, w - 6, 4);
      return;
    }

    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(enemy.facing, 1);
    ctx.translate(-w / 2, -h / 2);

    ctx.fillStyle = '#FDE047';
    ctx.fillRect(w - 12, 2, 11, 13);
    ctx.fillStyle = '#111827';
    ctx.fillRect(w - 6, 5, 3, 4);
    ctx.fillStyle = '#14532D';
    ctx.fillRect(1, 11, w - 10, 20);
    ctx.fillStyle = '#22C55E';
    ctx.fillRect(3, 13, w - 14, 16);
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(w - 11, 15, 7, 15);
    const step = Math.floor(time * 8) % 2 === 0 ? 0 : 2;
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(5 + step, h - 6, 8, 6);
    ctx.fillRect(w - 13 - step, h - 6, 8, 6);
    ctx.restore();
    return;
  }

  // Piranha
  ctx.fillStyle = '#16A34A';
  ctx.fillRect(x + 10, y + 18, w - 20, h - 18);
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(x + 2, y, w - 4, 20);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x + 5, y + 10, 4, 4);
  ctx.fillRect(x + w - 9, y + 10, 4, 4);
  const chomp = Math.floor(time * 8) % 2 === 0;
  ctx.fillStyle = '#111827';
  ctx.fillRect(x + 6, y, w - 12, chomp ? 6 : 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x + 7, y + 1, 3, 3);
  ctx.fillRect(x + w - 10, y + 1, 3, 3);
}

export function drawItem(ctx: CanvasRenderingContext2D, item: ItemEntity, time: number) {
  const x = Math.floor(item.x);
  const y = Math.floor(item.y);
  const w = item.w;
  const h = item.h;

  if (item.kind === 'mushroom' || item.kind === 'oneup') {
    const cap = item.kind === 'oneup' ? '#16A34A' : '#EF4444';
    ctx.fillStyle = '#1F2937';
    ctx.fillRect(x + 3, y, w - 6, h - 2);
    ctx.fillStyle = cap;
    ctx.fillRect(x + 2, y + 2, w - 4, 16);
    ctx.fillRect(x + 5, y, w - 10, 4);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + 5, y + 5, 5, 6);
    ctx.fillRect(x + w - 10, y + 5, 5, 6);
    ctx.fillRect(x + 12, y + 2, 5, 4);
    ctx.fillStyle = '#FEF3C7';
    ctx.fillRect(x + 6, y + 18, w - 12, h - 18);
    ctx.fillStyle = '#111827';
    ctx.fillRect(x + 10, y + 20, 2, 5);
    ctx.fillRect(x + w - 12, y + 20, 2, 5);
    return;
  }

  if (item.kind === 'fireflower') {
    const flash = Math.floor(time * 12) % 2 === 0;
    ctx.fillStyle = '#16A34A';
    ctx.fillRect(x + 12, y + 15, 6, 15);
    ctx.fillRect(x + 4, y + 20, 8, 5);
    ctx.fillRect(x + 18, y + 20, 8, 5);
    ctx.fillStyle = flash ? '#F97316' : '#EF4444';
    ctx.fillRect(x + 3, y + 2, w - 6, 14);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(x + 7, y + 4, w - 14, 10);
    ctx.fillStyle = '#FFFBEB';
    ctx.fillRect(x + 11, y + 6, 8, 6);
    return;
  }

  const colors = ['#FACC15', '#FEF08A', '#FB923C', '#38BDF8'];
  ctx.fillStyle = colors[Math.floor(time * 14) % colors.length];
  ctx.beginPath();
  const cx = x + w / 2;
  const cy = y + h / 2;
  for (let i = 0; i < 5; i++) {
    const a1 = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    const a2 = a1 + Math.PI / 5;
    const ox = cx + Math.cos(a1) * 14;
    const oy = cy + Math.sin(a1) * 14;
    const ix = cx + Math.cos(a2) * 6;
    const iy = cy + Math.sin(a2) * 6;
    if (i === 0) ctx.moveTo(ox, oy);
    else ctx.lineTo(ox, oy);
    ctx.lineTo(ix, iy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#111827';
  ctx.fillRect(cx - 4, cy - 3, 2, 5);
  ctx.fillRect(cx + 2, cy - 3, 2, 5);
}

export function drawFireball(ctx: CanvasRenderingContext2D, fb: Fireball, time: number) {
  const x = Math.floor(fb.x);
  const y = Math.floor(fb.y);
  const pulse = Math.floor(time * 24) % 2 === 0;
  ctx.fillStyle = pulse ? '#F97316' : '#EF4444';
  ctx.beginPath();
  ctx.arc(x + 6, y + 6, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.arc(x + 6, y + 6, 3, 0, Math.PI * 2);
  ctx.fill();
}

export function drawFlagAndCastle(
  ctx: CanvasRenderingContext2D,
  flagX: number,
  flagTopY: number,
  flagBottomY: number,
  flagCurrentY: number,
  castleX: number,
  groundY: number
) {
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(flagX + 13, flagTopY, 6, flagBottomY - flagTopY);
  ctx.fillStyle = '#FACC15';
  ctx.beginPath();
  ctx.arc(flagX + 16, flagTopY, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#10B981';
  ctx.beginPath();
  ctx.moveTo(flagX + 13, flagCurrentY);
  ctx.lineTo(flagX - 18, flagCurrentY + 12);
  ctx.lineTo(flagX + 13, flagCurrentY + 24);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#FEF08A';
  ctx.fillRect(flagX - 2, flagCurrentY + 9, 6, 6);

  const cw = 128;
  const ch = 128;
  const cy = groundY - ch;
  ctx.fillStyle = '#9A4E3B';
  ctx.fillRect(castleX, cy + 36, cw, ch - 36);
  ctx.fillRect(castleX + 24, cy, cw - 48, 40);
  ctx.fillStyle = '#6B2F22';
  for (let bx = 0; bx < cw; bx += 22) {
    ctx.fillRect(castleX + bx, cy + 28, 12, 10);
  }
  for (let bx = 24; bx < cw - 24; bx += 20) {
    ctx.fillRect(castleX + bx, cy - 8, 10, 10);
  }
  ctx.fillStyle = '#1E1B2E';
  ctx.fillRect(castleX + cw / 2 - 16, groundY - 46, 32, 46);
  ctx.beginPath();
  ctx.arc(castleX + cw / 2, groundY - 46, 16, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#FDE047';
  ctx.fillRect(castleX + 38, cy + 16, 10, 14);
  ctx.fillRect(castleX + cw - 48, cy + 16, 10, 14);
}

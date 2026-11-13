import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Flame,
  Gamepad2,
  Music,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { audio } from './game/audio';
import { PlatformerEngine } from './game/engine';
import { STAGE_1_1 } from './game/levels';
import { HudSnapshot, InputState, VIEW_HEIGHT, VIEW_WIDTH } from './game/types';

const POWER_LABELS: Record<HudSnapshot['powerState'], string> = {
  small: 'ノーマル',
  big: 'スーパー',
  fire: 'ファイア',
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<PlatformerEngine | null>(null);

  const inputRef = useRef<InputState>({
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    dash: false,
    fire: false,
  });

  const [hud, setHud] = useState<HudSnapshot>({
    status: 'TITLE_MENU',
    score: 0,
    highScore: 0,
    coins: 0,
    lives: 3,
    timeLeft: 300,
    stageCode: STAGE_1_1.code,
    stageName: STAGE_1_1.name,
    powerState: 'small',
    lastTimeBonus: 0,
    starActive: false,
  });

  const [muted, setMuted] = useState(false);
  const [bgmOn, setBgmOn] = useState(true);
  const [showTouchPad, setShowTouchPad] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
      setShowTouchPad(true);
    }
  }, []);

  useEffect(() => {
    const engine = new PlatformerEngine((snapshot) => {
      setHud(snapshot);
    });
    engineRef.current = engine;

    let rafId = 0;
    let lastTime = performance.now();
    let accumulator = 0;
    const FIXED_DT = 1 / 60;

    const frame = (now: number) => {
      const elapsed = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      accumulator += elapsed;

      while (accumulator >= FIXED_DT) {
        engine.update(FIXED_DT, inputRef.current);
        accumulator -= FIXED_DT;
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          engine.render(ctx);
        }
      }

      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);
    return () => {
      window.cancelAnimationFrame(rafId);
      audio.stopBgm();
    };
  }, []);

  useEffect(() => {
    const updateKey = (code: string, pressed: boolean) => {
      const inp = inputRef.current;
      switch (code) {
        case 'ArrowLeft':
        case 'KeyA':
          inp.left = pressed;
          break;
        case 'ArrowRight':
        case 'KeyD':
          inp.right = pressed;
          break;
        case 'ArrowDown':
        case 'KeyS':
          inp.down = pressed;
          break;
        case 'Space':
        case 'ArrowUp':
        case 'KeyW':
        case 'KeyZ':
          inp.jump = pressed;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyX':
        case 'KeyK':
          inp.dash = pressed;
          inp.fire = pressed;
          break;
        case 'KeyC':
        case 'KeyJ':
          inp.fire = pressed;
          break;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.repeat) return;

      const engine = engineRef.current;
      if (!engine) return;

      if (e.code === 'Escape' || e.code === 'KeyP') {
        const st = engine.getStatus();
        if (st === 'PLAYING' || st === 'PAUSED') {
          engine.togglePause();
        }
        return;
      }

      if (e.code === 'Enter') {
        const st = engine.getStatus();
        if (st === 'TITLE_MENU' || st === 'GAME_OVER' || st === 'VICTORY') {
          engine.startNewGame();
          return;
        }
      }

      updateKey(e.code, true);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      updateKey(e.code, false);
    };

    const onBlur = () => {
      inputRef.current = {
        left: false,
        right: false,
        up: false,
        down: false,
        jump: false,
        dash: false,
        fire: false,
      };
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const handleToggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    audio.setMuted(next);
  }, [muted]);

  const handleToggleBgm = useCallback(() => {
    const next = !bgmOn;
    setBgmOn(next);
    audio.setBgmEnabled(next);
  }, [bgmOn]);

  const setVirtualKey = (key: keyof InputState, value: boolean) => {
    inputRef.current[key] = value;
  };

  return (
    <div className="min-h-screen bg-[#0B1020] text-slate-100 flex flex-col items-center justify-between px-4 py-3 md:px-8 md:py-5">
      <header className="w-full max-w-[1040px] flex items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-baseline gap-3">
          <h1 className="font-arcade text-lg md:text-xl tracking-wide text-amber-300 whitespace-nowrap shrink-0">
            スーパーキノコダッシュ
          </h1>
          <span className="hidden sm:inline text-xs text-slate-400 whitespace-nowrap">
            1-1 みどりの草原
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowTouchPad((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
              showTouchPad
                ? 'bg-amber-400/15 border-amber-400/50 text-amber-300'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
            aria-pressed={showTouchPad}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">タッチ操作</span>
          </button>

          <button
            type="button"
            onClick={handleToggleBgm}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
              bgmOn && !muted
                ? 'bg-slate-800 border-slate-600 text-slate-100'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            aria-label="BGM切り替え"
          >
            <Music className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{bgmOn ? 'BGM ON' : 'BGM OFF'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleMute}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            aria-label={muted ? 'ミュート解除' : 'ミュート'}
          >
            {muted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{muted ? '消音中' : '音声ON'}</span>
          </button>

          {(hud.status === 'PLAYING' || hud.status === 'PAUSED') && (
            <button
              type="button"
              onClick={() => engineRef.current?.togglePause()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-amber-400 text-slate-950 hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0"
            >
              {hud.status === 'PAUSED' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{hud.status === 'PAUSED' ? '再開' : 'ポーズ'}</span>
            </button>
          )}
        </div>
      </header>

      <main className="w-full max-w-[1040px] flex-1 flex flex-col items-center justify-center py-3">
        <div className="w-full grid grid-cols-3 sm:grid-cols-6 gap-2 px-4 py-2.5 bg-[#12192E] border border-b-0 border-slate-800 rounded-t-xl text-xs">
          <div>
            <div className="text-slate-400">スコア</div>
            <div className="font-score text-sm md:text-base font-bold text-white">
              {String(hud.score).padStart(6, '0')}
            </div>
          </div>
          <div>
            <div className="text-slate-400">コイン</div>
            <div className="font-score text-sm md:text-base font-bold text-amber-300">
              × {String(hud.coins).padStart(2, '0')}
            </div>
          </div>
          <div>
            <div className="text-slate-400">ステージ</div>
            <div className="font-arcade text-sm md:text-base text-sky-300 truncate">
              {hud.stageCode} {hud.stageName}
            </div>
          </div>
          <div>
            <div className="text-slate-400">状態</div>
            <div className="text-sm md:text-base font-semibold text-emerald-300">
              {hud.starActive ? 'スター無敵' : POWER_LABELS[hud.powerState]}
            </div>
          </div>
          <div>
            <div className="text-slate-400">のこり</div>
            <div className="font-score text-sm md:text-base font-bold text-rose-300">
              × {hud.lives}
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-400">タイム</div>
            <div
              className={`font-score text-sm md:text-base font-bold ${
                hud.timeLeft <= 40 && hud.status === 'PLAYING' ? 'text-rose-400' : 'text-white'
              }`}
            >
              {String(hud.timeLeft).padStart(3, '0')}
            </div>
          </div>
        </div>

        <div className="relative w-full aspect-[15/8] bg-slate-950 border border-slate-800 rounded-b-xl overflow-hidden shadow-2xl">
          <canvas
            ref={canvasRef}
            width={VIEW_WIDTH}
            height={VIEW_HEIGHT}
            className="w-full h-full block"
          />

          {hud.status === 'TITLE_MENU' && (
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-[#11182C]/95 border border-slate-700/80 rounded-xl p-6 md:p-7 shadow-2xl text-center">
                <p className="text-xs text-amber-300 tracking-wider mb-1">
                  ハイスコア {String(hud.highScore).padStart(6, '0')}
                </p>
                <h2 className="font-arcade text-2xl md:text-4xl text-white tracking-wide mb-2">
                  スーパーキノコダッシュ
                </h2>
                <p className="text-xs md:text-sm text-slate-300 mb-6">
                  1-1 みどりの草原 — 走って、踏んで、ゴールフラッグを目指そう！
                </p>

                <button
                  type="button"
                  onClick={() => engineRef.current?.startNewGame()}
                  className="w-full sm:w-auto px-8 py-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm md:text-base transition-colors cursor-pointer whitespace-nowrap"
                >
                  ゲームスタート
                </button>

                <div className="mt-6 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300">
                  <div>
                    <span className="text-slate-400 block">移動</span>
                    <span className="font-score text-white">← → / A D</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">ジャンプ</span>
                    <span className="font-score text-white">Space / Z / ↑</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">ダッシュ・ファイア</span>
                    <span className="font-score text-white">Shift / X</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">ポーズ</span>
                    <span className="font-score text-white">P / Esc</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {hud.status === 'PAUSED' && (
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] flex items-center justify-center p-4">
              <div className="w-full max-w-sm bg-[#11182C] border border-slate-700 rounded-xl p-6 text-center shadow-2xl">
                <h2 className="font-arcade text-2xl text-white mb-2">ポーズ中</h2>
                <p className="text-xs text-slate-400 mb-5">
                  {hud.stageCode} {hud.stageName}
                </p>
                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => engineRef.current?.togglePause()}
                    className="w-full py-2.5 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-colors"
                  >
                    ゲームを再開する
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.restartStage()}
                    className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-colors"
                  >
                    ステージをやり直す
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.returnToTitle()}
                    className="w-full py-2.5 px-4 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium text-sm transition-colors"
                  >
                    タイトルへ戻る
                  </button>
                </div>
              </div>
            </div>
          )}

          {hud.status === 'GAME_OVER' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px] flex items-center justify-center p-4">
              <div className="w-full max-w-sm bg-[#11182C] border border-rose-500/40 rounded-xl p-6 text-center shadow-2xl">
                <h2 className="font-arcade text-3xl text-rose-400 mb-2">ゲームオーバー</h2>
                <p className="text-xs text-slate-400 mb-4">
                  {hud.stageCode} {hud.stageName}
                </p>

                <div className="grid grid-cols-2 gap-3 bg-slate-900 border border-slate-800 rounded-lg p-3.5 mb-5 text-sm">
                  <div>
                    <div className="text-xs text-slate-400">最終スコア</div>
                    <div className="font-score font-bold text-white">{hud.score}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">ハイスコア</div>
                    <div className="font-score font-bold text-amber-300">{hud.highScore}</div>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => engineRef.current?.startNewGame()}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>もういちど遊ぶ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.returnToTitle()}
                    className="w-full py-2.5 px-4 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium text-sm transition-colors"
                  >
                    タイトルへ戻る
                  </button>
                </div>
              </div>
            </div>
          )}

          {hud.status === 'VICTORY' && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-[#11182C] border border-amber-400/50 rounded-xl p-6 text-center shadow-2xl">
                <h2 className="font-arcade text-2xl md:text-3xl text-amber-300 mb-2">
                  ステージクリア！
                </h2>
                <p className="text-xs md:text-sm text-slate-300 mb-4">
                  おめでとう！{hud.stageCode} {hud.stageName} を見事クリアしました！
                </p>

                <div className="grid grid-cols-3 gap-2 bg-slate-900 border border-slate-800 rounded-lg p-3.5 mb-5 text-sm">
                  <div>
                    <div className="text-xs text-slate-400">タイムボーナス</div>
                    <div className="font-score font-bold text-emerald-300">+{hud.lastTimeBonus}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">最終スコア</div>
                    <div className="font-score font-bold text-white">{hud.score}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">ハイスコア</div>
                    <div className="font-score font-bold text-amber-300">{hud.highScore}</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={() => engineRef.current?.startNewGame()}
                    className="flex-1 py-2.5 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-colors"
                  >
                    もういちど遊ぶ
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.returnToTitle()}
                    className="flex-1 py-2.5 px-4 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-200 font-medium text-sm transition-colors"
                  >
                    タイトルへ戻る
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {showTouchPad && (
          <div className="w-full mt-3 flex items-center justify-between gap-4 px-2 select-none touch-none">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="左へ移動"
                onPointerDown={() => setVirtualKey('left', true)}
                onPointerUp={() => setVirtualKey('left', false)}
                onPointerLeave={() => setVirtualKey('left', false)}
                onPointerCancel={() => setVirtualKey('left', false)}
                className="w-14 h-14 rounded-xl bg-slate-800 active:bg-slate-600 border border-slate-600 flex items-center justify-center text-white"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                aria-label="しゃがむ"
                onPointerDown={() => setVirtualKey('down', true)}
                onPointerUp={() => setVirtualKey('down', false)}
                onPointerLeave={() => setVirtualKey('down', false)}
                onPointerCancel={() => setVirtualKey('down', false)}
                className="w-12 h-14 rounded-xl bg-slate-800 active:bg-slate-600 border border-slate-600 flex items-center justify-center text-slate-300"
              >
                <ArrowDown className="w-5 h-5" />
              </button>
              <button
                type="button"
                aria-label="右へ移動"
                onPointerDown={() => setVirtualKey('right', true)}
                onPointerUp={() => setVirtualKey('right', false)}
                onPointerLeave={() => setVirtualKey('right', false)}
                onPointerCancel={() => setVirtualKey('right', false)}
                className="w-14 h-14 rounded-xl bg-slate-800 active:bg-slate-600 border border-slate-600 flex items-center justify-center text-white"
              >
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onPointerDown={() => {
                  setVirtualKey('dash', true);
                  setVirtualKey('fire', true);
                }}
                onPointerUp={() => {
                  setVirtualKey('dash', false);
                  setVirtualKey('fire', false);
                }}
                onPointerLeave={() => {
                  setVirtualKey('dash', false);
                  setVirtualKey('fire', false);
                }}
                onPointerCancel={() => {
                  setVirtualKey('dash', false);
                  setVirtualKey('fire', false);
                }}
                className="min-w-[68px] h-14 px-3 rounded-xl bg-amber-500 active:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 shadow"
              >
                <Flame className="w-4 h-4" />
                <span>B ダッシュ</span>
              </button>
              <button
                type="button"
                onPointerDown={() => setVirtualKey('jump', true)}
                onPointerUp={() => setVirtualKey('jump', false)}
                onPointerLeave={() => setVirtualKey('jump', false)}
                onPointerCancel={() => setVirtualKey('jump', false)}
                className="min-w-[80px] h-14 px-4 rounded-xl bg-rose-600 active:bg-rose-500 text-white font-bold text-sm flex items-center justify-center shadow"
              >
                A ジャンプ
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full max-w-[1040px] pt-2 text-center text-xs text-slate-400">
        <span>移動: ← → / A D</span>
        <span className="mx-2 text-slate-600">·</span>
        <span>ジャンプ: Space / Z / ↑（長押しで高くジャンプ）</span>
        <span className="mx-2 text-slate-600">·</span>
        <span>ダッシュ・ファイアボール: Shift / X</span>
        <span className="mx-2 text-slate-600">·</span>
        <span>ポーズ: P / Esc</span>
      </footer>
    </div>
  );
}

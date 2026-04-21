"use client";

import { useEffect, useRef, useState } from "react";

interface PuzzleFinaleModalProps {
  imageUrl: string;
  slotMap: number[];
  onComplete: () => void;
}

function getSwapCycles(slotMap: number[]): number[][] {
  const visited = new Set<number>();
  const cycles: number[][] = [];

  for (let i = 0; i < slotMap.length; i++) {
    if (visited.has(i) || slotMap[i] === i) {
      visited.add(i);
      continue;
    }
    const cycle: number[] = [];
    let cur = i;
    while (!visited.has(cur)) {
      visited.add(cur);
      cycle.push(cur);
      cur = slotMap[cur];
    }
    if (cycle.length > 1) cycles.push(cycle);
  }
  return cycles;
}

export default function PuzzleFinaleModal({ imageUrl, slotMap, onComplete }: PuzzleFinaleModalProps) {
  const [gridSize, setGridSize] = useState(0);
  const [bgOpacity, setBgOpacity] = useState(0);
  const [isSealed, setIsSealed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [badgeVisible, setBadgeVisible] = useState(false);
  const [closeVisible, setCloseVisible] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState<{x: number, duration: number, delay: number, color: string, initialAngle: number}[]>([]);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const tileRefs = useRef<(HTMLDivElement | null)[]>(Array(9).fill(null));
  const ghostRefs = useRef<(HTMLDivElement | null)[]>(Array(9).fill(null));
  const tileBlurRefs = useRef<(HTMLDivElement | null)[]>(Array(9).fill(null));
  
  const tileCurrentSlot = useRef<number[]>([0,1,2,3,4,5,6,7,8]);
  const slotOccupant = useRef<(number|null)[]>([0,1,2,3,4,5,6,7,8]);
  const cycles = useRef<number[][]>([]);
  const timeouts = useRef<NodeJS.Timeout[]>([]);
  const activeNodesRef = useRef<(OscillatorNode | AudioBufferSourceNode)[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const tensionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const prefersReduced = typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;
  
  const scheduleDelay = (ms: number) => new Promise<void>(resolve => {
    const id = setTimeout(resolve, ms);
    timeouts.current.push(id);
  });

  useEffect(() => {
    setGridSize(Math.min(window.innerWidth * 0.75, 480));
    setConfettiPieces(Array.from({length: 80}, () => ({
      x: 5 + Math.random() * 90,
      duration: 2.5 + Math.random() * 2,
      delay: Math.random() * 2,
      color: ['#7F77DD','#5DCAA5','#D85A30','#EF9F27','#378ADD','#D4537E'][Math.floor(Math.random()*10)],
      initialAngle: Math.random() * 360
    })));
  }, []);

  const spawnAudioCtx = () => {
    if (!audioCtxRef.current) {
       const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
       if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  };

  const playLiftSound = () => {
    const ctx = spawnAudioCtx(); if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(280, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(480, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start(); osc.stop(ctx.currentTime + 0.1);
    activeNodesRef.current.push(osc);
  };

  const playWhooshSound = () => {
    const ctx = spawnAudioCtx(); if (!ctx) return;
    const bufferSize = ctx.sampleRate * 0.35;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = 900; filter.Q.value = 1.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    source.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    source.start(); source.stop(ctx.currentTime + 0.35);
    activeNodesRef.current.push(source);
  };

  const playLandingSound = () => {
    const ctx = spawnAudioCtx(); if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.65, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(); osc.stop(ctx.currentTime + 0.15);
    activeNodesRef.current.push(osc);
  };

  const playBumpSound = () => {
    const ctx = spawnAudioCtx(); if (!ctx) return;
    [400, 260].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.055;
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      osc.start(t); osc.stop(t + 0.07);
      activeNodesRef.current.push(osc);
    });
  };

  const playCycleCompleteSound = () => {
    const ctx = spawnAudioCtx(); if (!ctx) return;
    [659.25, 830.61, 987.77].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.start(t); osc.stop(t + 0.5);
      activeNodesRef.current.push(osc);
    });
  };

  const playVictoryHit = () => {
    const ctx = spawnAudioCtx(); if (!ctx) return;
    const now = ctx.currentTime;

    const kick = ctx.createOscillator();
    const kickGain = ctx.createGain();
    kick.type = 'sine';
    kick.connect(kickGain); kickGain.connect(ctx.destination);
    kick.frequency.setValueAtTime(140, now);
    kick.frequency.exponentialRampToValueAtTime(52, now + 0.16);
    kickGain.gain.setValueAtTime(0.45, now);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    kick.start(now); kick.stop(now + 0.18);
    activeNodesRef.current.push(kick);

    const chime = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    chime.type = 'triangle';
    chime.connect(chimeGain); chimeGain.connect(ctx.destination);
    chime.frequency.setValueAtTime(1046.5, now + 0.02);
    chime.frequency.linearRampToValueAtTime(1174.66, now + 0.2);
    chimeGain.gain.setValueAtTime(0.001, now + 0.02);
    chimeGain.gain.linearRampToValueAtTime(0.2, now + 0.06);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    chime.start(now + 0.02); chime.stop(now + 0.42);
    activeNodesRef.current.push(chime);
  };

  const startTensionMusic = () => {
    const ctx = spawnAudioCtx(); if (!ctx) return;
    const notes = [220, 261.63, 329.63, 392.0]; // A Minor pentatonic suspense
    let step = 0;
    
    const playBassPulse = () => {
       const b = ctx.createOscillator();
       const bGain = ctx.createGain();
       b.type = 'sawtooth';
       b.connect(bGain); bGain.connect(ctx.destination);
       b.frequency.value = 110; 
       bGain.gain.setValueAtTime(0.12, ctx.currentTime);
       bGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
       b.start(); b.stop(ctx.currentTime + 0.3);
       activeNodesRef.current.push(b);
    };

    const interval = setInterval(() => {
      if (step % 4 === 0) playBassPulse();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = notes[step % notes.length];
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      
      osc.start(); osc.stop(ctx.currentTime + 0.15);
      activeNodesRef.current.push(osc);
      step++;
    }, 150); 
    
    tensionIntervalRef.current = interval;
  };

  const stopTensionMusic = () => {
    if (tensionIntervalRef.current) {
      clearInterval(tensionIntervalRef.current);
      tensionIntervalRef.current = null;
    }
  };

  const playRiser = () => {
    const ctx = spawnAudioCtx(); if (!ctx) return;
    
    const bufferSize = ctx.sampleRate * 2.0;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.Q.value = 3.0;
    filter.frequency.setValueAtTime(200, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(4000, ctx.currentTime + 1.9); 
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 1.9);
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 2.0);
    
    noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    noise.start(); noise.stop(ctx.currentTime + 2.0);
    activeNodesRef.current.push(noise);

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.connect(oscGain); oscGain.connect(ctx.destination);
    osc.frequency.setValueAtTime(110, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 1.9);
    oscGain.gain.setValueAtTime(0.001, ctx.currentTime);
    oscGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 1.9);
    oscGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 2.0);
    osc.start(); osc.stop(ctx.currentTime + 2.0);
    activeNodesRef.current.push(osc);
  };

  const playFinaleFanfare = () => {
    const ctx = spawnAudioCtx(); if (!ctx) return;
    
    const melody = [392.00, 392.00, 392.00, 523.25, 440.00, 523.25, 659.25]; 
    const timings = [0, 0.16, 0.32, 0.48, 0.88, 1.12, 1.35]; 
    
    const cymbalBuffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const cData = cymbalBuffer.getChannelData(0);
    for (let i=0; i<cymbalBuffer.length; i++) cData[i] = (Math.random()*2-1) * Math.exp(-i/(ctx.sampleRate*0.5));
    const cymbal = ctx.createBufferSource();
    cymbal.buffer = cymbalBuffer;
    const cFilter = ctx.createBiquadFilter();
    cFilter.type = 'highpass'; cFilter.frequency.value = 4000;
    const cGain = ctx.createGain();
    cGain.gain.setValueAtTime(0.4, ctx.currentTime);
    cGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 3);
    cymbal.connect(cFilter); cFilter.connect(cGain); cGain.connect(ctx.destination);
    cymbal.start(); activeNodesRef.current.push(cymbal);

    melody.forEach((freq, i) => {
      const t = ctx.currentTime + timings[i];
      const duration = i === melody.length - 1 ? 4.0 : (timings[i+1] - timings[i] - 0.02);
      
      [0, -4, 4].forEach(detune => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = detune === 0 ? 'triangle' : 'sawtooth';
        osc.detune.value = detune;
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, t);
        
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(detune === 0 ? 0.35 : 0.15, t + 0.05);
        
        if (i === melody.length - 1) {
          gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        } else {
          gain.gain.setValueAtTime(detune === 0 ? 0.35 : 0.15, t + duration - 0.05);
          gain.gain.linearRampToValueAtTime(0.001, t + duration);
        }
        
        osc.start(t); osc.stop(t + duration);
        activeNodesRef.current.push(osc);
      });
    });

    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = 'square';
    bass.connect(bassGain); bassGain.connect(ctx.destination);
    bass.frequency.setValueAtTime(65.41, ctx.currentTime);
    bass.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 3.0); 
    bassGain.gain.setValueAtTime(0.3, ctx.currentTime);
    bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.0);
    bass.start(); bass.stop(ctx.currentTime + 3.0);
    activeNodesRef.current.push(bass);
  };

  const finishAndUnmount = () => {
    setBgOpacity(0);
    stopTensionMusic();
    activeNodesRef.current.forEach(n => { try { n.stop(); } catch(e) {} });
    setTimeout(onComplete, 1200);
  };

  useEffect(() => {
    if (gridSize === 0) return;
    cycles.current = getSwapCycles(slotMap);

    if (prefersReduced) {
       setBgOpacity(0.88);
       setIsSealed(true);
       setShowConfetti(true);
       setBadgeVisible(true);
       setCloseVisible(true);
       tileRefs.current.forEach((el, i) => {
         if (!el) return;
         const pIdx = slotMap[i];
         const col = pIdx % 3; const row = Math.floor(pIdx / 3);
         el.style.left = col * (gridSize/3) + 'px';
         el.style.top = row * (gridSize/3) + 'px';
         if (tileBlurRefs.current[i]) tileBlurRefs.current[i]!.style.opacity = '0';
       });
       setTimeout(finishAndUnmount, 4000);
       return;
    }

    setBgOpacity(0.88);
    const id = setTimeout(() => {
       runAllCycles();
    }, 800);
    timeouts.current.push(id);

    return () => {
       timeouts.current.forEach(clearTimeout);
       stopTensionMusic();
       activeNodesRef.current.forEach(n => { try { n.stop(); } catch(e) {} });
    };
  }, [gridSize]);

  const smoothstep = (t: number) => t * t * (3 - 2 * t);
  const slotCenter = (slotIndex: number) => {
    const ts = gridSize / 3;
    return { x: (slotIndex % 3) * ts + ts/2, y: Math.floor(slotIndex / 3) * ts + ts/2 };
  };

  const removeBlurOverlay = (tileIndex: number) => {
    if (tileBlurRefs.current[tileIndex]) tileBlurRefs.current[tileIndex]!.style.opacity = '0';
  };

  const flashGhostSlot = (slotIndex: number) => {
    const ghost = ghostRefs.current[slotIndex];
    if (!ghost) return;
    ghost.style.transition = 'border-color 0.15s, box-shadow 0.15s';
    ghost.style.borderColor = 'rgba(239,159,39,0.9)';
    ghost.style.boxShadow = '0 0 20px rgba(239,159,39,0.4), inset 0 0 20px rgba(239,159,39,0.1)';
  };

  const lockTile = (tileIndex: number, slotIndex: number) => {
    const tileEl = tileRefs.current[tileIndex];
    if (!tileEl) return;
    const ts = gridSize / 3;
    tileEl.style.left = (slotIndex % 3) * ts + 'px';
    tileEl.style.top = Math.floor(slotIndex / 3) * ts + 'px';

    tileEl.style.transition = 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)';
    tileEl.style.transform = 'scale(1.05)';
    setTimeout(() => {
      if (!tileEl) return;
      tileEl.style.transform = 'scale(1)';
      setTimeout(() => { tileEl.style.transition = 'none'; }, 250);
    }, 20);

    const ghost = ghostRefs.current[slotIndex];
    if (ghost) {
      ghost.style.borderColor = 'rgba(239,159,39,0)';
      ghost.style.boxShadow = 'none';
    }
    removeBlurOverlay(tileIndex);
  };

  const flyTile = (tileIndex: number, fromSlot: number, toSlot: number, onLanded: () => void) => {
    const from = slotCenter(fromSlot);
    const to = slotCenter(toSlot);
    const ts = gridSize / 3;

    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const dist = Math.sqrt((to.x-from.x)**2 + (to.y-from.y)**2);
    const arcHeight = Math.max(80, dist * 0.5);
    const P1 = { x: midX, y: midY - arcHeight };

    const DURATION = 750;
    const startTime = performance.now();
    const tileEl = tileRefs.current[tileIndex];
    if (!tileEl) return;

    tileEl.style.transition = 'none';
    tileEl.style.zIndex = '10';
    tileEl.style.boxShadow = '0 12px 40px rgba(0,0,0,0.5)';
    tileEl.style.transform = 'scale(1.08)';

    playLiftSound();
    const wId = setTimeout(() => playWhooshSound(), 50);
    timeouts.current.push(wId);

    function frame(now: number) {
      const elapsed = now - startTime;
      const rawT = Math.min(elapsed / DURATION, 1);
      const t = smoothstep(rawT);

      const x = (1-t)*(1-t)*from.x + 2*(1-t)*t*P1.x + t*t*to.x;
      const y = (1-t)*(1-t)*from.y + 2*(1-t)*t*P1.y + t*t*to.y;

      tileEl!.style.left = (x - ts/2) + 'px';
      tileEl!.style.top  = (y - ts/2) + 'px';

      const rotAngle = Math.sin(rawT * Math.PI) * 8;
      tileEl!.style.transform = `scale(${1.08 - rawT * 0.08}) rotate(${rotAngle}deg)`;

      if (rawT < 1) {
        requestAnimationFrame(frame);
      } else {
        tileEl!.style.left = (to.x - ts/2) + 'px';
        tileEl!.style.top  = (to.y - ts/2) + 'px';
        tileEl!.style.transform = 'scale(1) rotate(0deg)';
        tileEl!.style.zIndex = '1';
        tileEl!.style.boxShadow = 'none';
        playLandingSound();
        onLanded();
      }
    }
    requestAnimationFrame(frame);
  };

  const runCycle = async (cycle: number[]) => {
    let tileToFly = slotOccupant.current[cycle[0]];
    let currentSlotOfTile = cycle[0];

    for (let step = 0; step < cycle.length; step++) {
      if (tileToFly === null) break;
      
      const pieceIndex = slotMap[tileToFly];
      const trueSlot = pieceIndex; 
      
      flashGhostSlot(trueSlot);
      const bumpedTile = slotOccupant.current[trueSlot];
      const willBump = bumpedTile !== null && bumpedTile !== tileToFly;

      await new Promise<void>(resolve => {
        flyTile(tileToFly as number, currentSlotOfTile, trueSlot, () => {
          slotOccupant.current[currentSlotOfTile] = null;
          slotOccupant.current[trueSlot] = tileToFly;
          tileCurrentSlot.current[tileToFly as number] = trueSlot;
          lockTile(tileToFly as number, trueSlot);

          if (willBump) {
            const id = setTimeout(() => {
              playBumpSound();
              resolve();
            }, 120);
            timeouts.current.push(id);
          } else {
            resolve();
          }
        });
      });

      tileToFly = bumpedTile;
      currentSlotOfTile = trueSlot;

      if (step < cycle.length - 1) await scheduleDelay(200);
    }
  };

  const onAllTilesHome = async () => {
    stopTensionMusic();
    playRiser();
    
    tileRefs.current.forEach((el, i) => {
      if (!el) return;
      const trueSlot = slotMap[i]; 
      const col = trueSlot % 3;
      const row = Math.floor(trueSlot / 3);
      const ts = gridSize / 3;
      el.style.transition = 'left 0.4s ease, top 0.4s ease';
      el.style.left = col * ts + 'px';
      el.style.top  = row * ts + 'px';
    });

    await scheduleDelay(500);
    setIsSealed(true);
    
    if (stageRef.current) {
      stageRef.current.style.transition = 'box-shadow 1s ease';
      stageRef.current.style.boxShadow = '0 0 40px rgba(239,159,39,0.5), 0 0 100px rgba(239,159,39,0.2)';
    }

    await scheduleDelay(1500);
    setShowConfetti(true);
    setBadgeVisible(true);
    playFinaleFanfare();
    setCloseVisible(true);
    
    const sid = setTimeout(finishAndUnmount, 7500);
    timeouts.current.push(sid);
  };

  const runAllCycles = async () => {
    for (let i=0; i<9; i++) {
        const pieceIndex = slotMap[i];
        if (pieceIndex === i) {
           removeBlurOverlay(i);
        }
    }
    
    startTensionMusic();

    for (const cycle of cycles.current) {
      await runCycle(cycle);
      await scheduleDelay(400);
      playCycleCompleteSound();
    }
    onAllTilesHome();
  };

  if (gridSize === 0) return null;
  const TILE_SIZE = gridSize / 3;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `rgba(0,0,0,${bgOpacity})`,
      transition: 'background 1.5s ease',
    }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.5) 100%)'
      }} />

      <div ref={stageRef} style={{
        position: 'relative', width: gridSize, height: gridSize,
      }}>
        {/* Ghost Outlines */}
        {Array.from({length: 9}, (_, pieceIndex) => {
          const trueCol = pieceIndex % 3;
          const trueRow = Math.floor(pieceIndex / 3);
          return (
            <div
              key={`ghost-${pieceIndex}`}
              ref={el => { ghostRefs.current[pieceIndex] = el; }}
              style={{
                position: 'absolute', left: trueCol * TILE_SIZE + 'px', top: trueRow * TILE_SIZE + 'px',
                width: TILE_SIZE + 'px', height: TILE_SIZE + 'px',
                border: '1.5px dashed rgba(239,159,39,0.25)', borderRadius: '4px',
                pointerEvents: 'none', zIndex: 0,
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            />
          );
        })}

        {/* Flying Tiles */}
        {Array(9).fill(0).map((_, i) => {
          const pIdx = slotMap[i];
          const col = i % 3;
          const row = Math.floor(i / 3);
          const pieceCol = pIdx % 3;
          const pieceRow = Math.floor(pIdx / 3);
          return (
            <div
              key={`tile-${i}`}
              ref={el => { tileRefs.current[i] = el; }}
              style={{
                position: 'absolute', left: col * TILE_SIZE + 'px', top: row * TILE_SIZE + 'px',
                width: TILE_SIZE + 'px', height: TILE_SIZE + 'px',
                backgroundImage: `url(${imageUrl})`, backgroundSize: '300% 300%',
                backgroundPosition: `${pieceCol * 50}% ${pieceRow * 50}%`,
                transition: 'none', zIndex: 1, borderRadius: '2px', overflow: 'hidden'
              }}
            >
               <div 
                 ref={el => { tileBlurRefs.current[i] = el; }}
                 style={{
                   position: 'absolute', inset: 0, backdropFilter: 'blur(10px) brightness(0.7)',
                   background: 'rgba(0,0,0,0.2)', transition: 'opacity 0.6s ease',
                 }}
               >
                  <div style={{ position: 'absolute', padding: '12px', fontSize: '12px', fontWeight: 900, color: 'rgba(255,255,255,0.4)' }}>
                    {String(i+1).padStart(2, "0")}
                  </div>
               </div>
            </div>
          );
        })}

        {/* Shimmer Sweep overlay */}
        {isSealed && (
          <div style={{
             position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 60,
             background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)',
             animation: 'ludoShimmer 1.2s ease-out forwards'
          }} />
        )}
      </div>

      <style>{`
        @keyframes ludoShimmer {
          from { transform: translateX(-100%); }
          to   { transform: translateX(300%); }
        }
        @keyframes ludoConfettiFall {
          0%   { transform: translateY(0) rotate(var(--r0)); opacity: 1; }
          100% { transform: translateY(105vh) rotate(var(--r1)); opacity: 0.6; }
        }
        @keyframes ludoBadgeRise {
          from { transform: translateX(-50%) translateY(40px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0px); opacity: 1; }
        }
      `}</style>

      {/* Confetti container */}
      {showConfetti && (
         <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 100 }}>
             {confettiPieces.map((p, i) => (
                <div key={i} style={{
                   position: 'absolute', left: p.x + '%', top: '-16px',
                   width: '8px', height: '14px', background: p.color, borderRadius: '2px',
                   '--r0': p.initialAngle + 'deg', '--r1': (p.initialAngle + Math.random()*360) + 'deg',
                   animation: `ludoConfettiFall ${p.duration}s ease-in ${p.delay}s forwards`
                } as any} />
             ))}
         </div>
      )}

      {/* Mission Badge */}
      {badgeVisible && (
        <div style={{
          position: 'absolute', bottom: `calc(50% - ${gridSize/2}px - 60px)`, left: '50%',
          animation: 'ludoBadgeRise 0.9s cubic-bezier(0.34,1.56,0.64,1) both',
          background: 'linear-gradient(135deg, #534AB7, #0F6E56)', color: 'white',
          padding: '14px 36px', borderRadius: '999px', fontSize: '16px', fontWeight: 500, letterSpacing: '0.06em', whiteSpace: 'nowrap', zIndex: 110
        }}>
          Mission complete
        </div>
      )}

      {/* Close button */}
      {closeVisible && (
        <button 
          onClick={finishAndUnmount}
          style={{
            position: 'absolute', top: '24px', right: '32px', zIndex: 200,
            background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)',
            fontSize: '32px', cursor: 'pointer', transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        >×</button>
      )}
    </div>
  );
}

import React, { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWizard } from '../context/WizardContext';
import { SUBSTRATE_TYPES, PLATE_W, PLATE_H, STEP_COLORS, STEP_COLORS_DARK, VIRTUAL_GRID_DEFAULTS } from '../utils/plateConfigs';
import { ArrowLeft, ArrowRight, Plus, Trash2, Download, Upload, Droplets, ChevronUp, ChevronDown } from 'lucide-react';

// ── Well ID helpers ──────────────────────────────────────────────
const rowChar = r => String.fromCharCode(65 + r);
const wellId = (r, c) => `${rowChar(r)}${c + 1}`;

// ── Valid well IDs helper ────────────────────────────────────────
const computeValidWellIds = (substrate, virtualParams) => {
  const valid = new Set();
  if (substrate.type === 'petri') {
    const { n, pitch } = virtualParams;
    const physR = substrate.diameter / 2;
    const safeR = physR - 5;
    for (let ri = 0; ri < n; ri++) {
      for (let ci = 0; ci < n; ci++) {
        const physX = -(n - 1) * pitch / 2 + ci * pitch;
        const physY = -(n - 1) * pitch / 2 + ri * pitch;
        if (Math.sqrt(physX * physX + physY * physY) <= safeR) {
          valid.add(wellId(ri, ci));
        }
      }
    }
  } else if (substrate.type === 'slide') {
    const { width, height } = substrate;
    const scale = Math.min((PLATE_W - 16) / width, (PLATE_H - 16) / height);
    const sx = (PLATE_W - width * scale) / 2;
    const sy = (PLATE_H - height * scale) / 2;
    const { n, pitch } = virtualParams;
    const safeOffsetPhys = 2;
    const safeSX = sx + safeOffsetPhys * scale;
    const safeSY = sy + safeOffsetPhys * scale;
    const safeW = (width - safeOffsetPhys * 2) * scale;
    const safeH = (height - safeOffsetPhys * 2) * scale;
    const gridW = (n - 1) * pitch * scale;
    const gridH = (n - 1) * pitch * scale;
    const gridSX = sx + (width * scale - gridW) / 2;
    const gridSY = sy + (height * scale - gridH) / 2;
    for (let ri = 0; ri < n; ri++) {
      for (let ci = 0; ci < n; ci++) {
        const wx = gridSX + ci * pitch * scale;
        const wy = gridSY + ri * pitch * scale;
        if (wx >= safeSX && wx <= safeSX + safeW && wy >= safeSY && wy <= safeSY + safeH) {
          valid.add(wellId(ri, ci));
        }
      }
    }
  } else if (substrate.type === 'multiwell') {
    const { rows, cols } = substrate;
    for (let ri = 0; ri < rows; ri++) {
      for (let ci = 0; ci < cols; ci++) {
        valid.add(wellId(ri, ci));
      }
    }
  }
  return valid;
};

// ── Plate SVG Renderer ───────────────────────────────────────────
// Uses physical mm as SVG units (viewBox = plate dimensions)
const PlateRenderer = ({ substrate, selectedWells, stepWells, stepVolumes, onWellClick, wellMeta, virtualParams }) => {
  const { type } = substrate;
  const PLATE_RX = 3; // corner radius mm

  if (type === 'multiwell') {
    const { rows, cols, pitch, wellDiameter, a1 } = substrate;
    const r = wellDiameter / 2;

    const getWellColor = (id) => {
      for (let i = 0; i < stepWells.length; i++) {
        if (stepWells[i].has(id)) return STEP_COLORS[i % STEP_COLORS.length];
      }
      return null;
    };

    // Compute step index for each well so we can look up volume
    const wellStepMap = {};
    stepWells.forEach((wset, i) => wset.forEach(id => { wellStepMap[id] = i; }));

    const wells = [];
    const labels = [];
    const volTexts = [];
    const labelFontSize = Math.min(2.2, pitch * 0.22);

    for (let ri = 0; ri < rows; ri++) {
      for (let ci = 0; ci < cols; ci++) {
        const id = wellId(ri, ci);
        const cx = a1.x + ci * pitch;
        const cy = a1.y + ri * pitch;
        if (wellMeta) wellMeta.current[id] = { cx, cy, r };

        const stepIdx = wellStepMap[id];
        const stepColor = stepIdx !== undefined ? STEP_COLORS[stepIdx % STEP_COLORS.length] : null;
        const darkC = stepIdx !== undefined ? STEP_COLORS_DARK[stepIdx % STEP_COLORS_DARK.length] : null;
        const isSelected = selectedWells.has(id);
        const isLocked = stepColor !== null;

        let fill;
        if (stepColor)       fill = stepColor;
        else if (isSelected) fill = '#93c5fd';
        else                 fill = '#dde3ea';

        wells.push(
          <g key={id} onClick={() => !isLocked && onWellClick(id)} style={{ cursor: isLocked ? 'default' : 'pointer' }}>
            <circle cx={cx} cy={cy} r={r} fill={fill} stroke="none" />
          </g>
        );

        // Unified centered text (Nomenclature or Volume)
        const isAssigned = stepIdx !== undefined;
        const centeredText = isAssigned ? `${stepVolumes[stepIdx]}µL` : id;
        const textColor = isAssigned ? darkC : "#94a3b8";
        const fs = isAssigned ? Math.min(r * 0.42, 3.5) : Math.min(r * 0.48, 3.0);

        volTexts.push(
          <text key={`txt-${id}`} x={cx} y={cy}
            fontSize={fs} fill={textColor} textAnchor="middle" dominantBaseline="middle"
            fontWeight={isAssigned ? "600" : "400"}
            style={{ pointerEvents: 'none', userSelect: 'none', opacity: isAssigned ? 1 : 0.8 }}>
            {centeredText}
          </text>
        );
      }
    }

    return (
      <svg viewBox={`0 0 ${PLATE_W} ${PLATE_H}`} width="100%" style={{ display: 'block' }}>
        <rect x={0} y={0} width={PLATE_W} height={PLATE_H} rx={PLATE_RX} fill="#f4f6f9" stroke="#94a3b8" strokeWidth={1} />
        <path d={`M${PLATE_W - 8},0 L${PLATE_W},0 L${PLATE_W},8 Z`} fill="#cbd5e1" />
        {wells}
        {volTexts}
      </svg>
    );
  }

  if (type === 'petri') {
    const physR   = substrate.diameter / 2;        // usable radius in mm
    const safeR   = physR - 5;                     // 5mm safety offset from wall
    const cx = PLATE_W / 2, cy = PLATE_H / 2;
    const displayR = Math.min(PLATE_W, PLATE_H) * 0.44;
    const scale    = displayR / physR;             // SVG units per mm
    const safeDisplayR = safeR * scale;            // safe zone in SVG units

    const { n, pitch } = virtualParams;
    const dotR    = pitch * scale * 0.28;
    const labelFs = Math.max(pitch * scale * 0.2, 1.5);

    const wellStepMap = {};
    stepWells.forEach((wset, i) => wset.forEach(id => { wellStepMap[id] = i; }));

    const points = [], labels = [], volTexts = [];

    for (let ri = 0; ri < n; ri++) {
      for (let ci = 0; ci < n; ci++) {
        const id = wellId(ri, ci);
        // Physical offset from dish center (mm), grid centered at 0,0
        const physX = -(n - 1) * pitch / 2 + ci * pitch;
        const physY = -(n - 1) * pitch / 2 + ri * pitch;
        const dist  = Math.sqrt(physX * physX + physY * physY);

        // Exclude points whose center is within 5mm of the dish wall
        if (dist > safeR) continue;

        const wx = cx + physX * scale;
        const wy = cy + physY * scale;

        const stepIdx  = wellStepMap[id];
        const stepColor = stepIdx !== undefined ? STEP_COLORS[stepIdx % STEP_COLORS.length] : null;
        const darkC     = stepIdx !== undefined ? STEP_COLORS_DARK[stepIdx % STEP_COLORS_DARK.length] : null;
        const isSel     = selectedWells.has(id);
        const isLocked  = stepColor !== null;
        const fill      = stepColor || (isSel ? '#93c5fd' : '#dde3ea');

        wellMeta.current[id] = { cx: wx, cy: wy, r: dotR };

        points.push(
          <g key={id} onClick={() => !isLocked && onWellClick(id)}
            style={{ cursor: isLocked ? 'default' : 'pointer' }}>
            <circle cx={wx} cy={wy} r={dotR} fill={fill} stroke="none" />
          </g>
        );
        const isAssigned = stepIdx !== undefined;
        const centeredText = isAssigned ? `${stepVolumes[stepIdx]}µL` : id;
        const textColor = isAssigned ? darkC : "#94a3b8";
        const fs = isAssigned ? Math.min(dotR * 0.55, 3.5) : Math.min(dotR * 0.6, 3.2);

        volTexts.push(
          <text key={`txt-${id}`} x={wx} y={wy}
            fontSize={fs} fill={textColor} textAnchor="middle" dominantBaseline="middle"
            fontWeight={isAssigned ? "600" : "400"}
            style={{ pointerEvents: 'none', userSelect: 'none', opacity: isAssigned ? 1 : 0.8 }}>
            {centeredText}
          </text>
        );
      }
    }

    return (
      <svg viewBox={`0 0 ${PLATE_W} ${PLATE_H}`} width="100%" style={{ display: 'block' }}>
        {/* Main Petri perimeter */}
        <circle cx={cx} cy={cy} r={displayR} fill="#f4f6f9" stroke="#94a3b8" strokeWidth={1} />
        {/* Safety offset boundary (dashed) */}
        <circle cx={cx} cy={cy} r={safeDisplayR} fill="none"
          stroke="#cbd5e1" strokeWidth={0.3} strokeDasharray="1 1" />
        {points}
        {volTexts}
      </svg>
    );
  }

  if (type === 'slide') {
    const { width, height } = substrate;
    const scale   = Math.min((PLATE_W - 16) / width, (PLATE_H - 16) / height);
    const sx = (PLATE_W - width * scale) / 2;
    const sy = (PLATE_H - height * scale) / 2;
    const { n, pitch } = virtualParams;
    const dotR    = pitch * scale * 0.28;
    const labelFs = Math.max(pitch * scale * 0.2, 1.5);

    const wellStepMap = {};
    stepWells.forEach((wset, i) => wset.forEach(id => { wellStepMap[id] = i; }));

    const points = [], labels = [], volTexts = [];

    const safeOffsetPhys = 2; // 2mm safety offset
    const safeSX = sx + safeOffsetPhys * scale;
    const safeSY = sy + safeOffsetPhys * scale;
    const safeW  = (width - safeOffsetPhys * 2) * scale;
    const safeH  = (height - safeOffsetPhys * 2) * scale;

    // Grid centered in the slide
    const gridW = (n - 1) * pitch * scale;
    const gridH = (n - 1) * pitch * scale;
    const gridSX = sx + (width * scale - gridW) / 2;
    const gridSY = sy + (height * scale - gridH) / 2;

    for (let ri = 0; ri < n; ri++) {
      for (let ci = 0; ci < n; ci++) {
        const id = wellId(ri, ci);
        const wx = gridSX + ci * pitch * scale;
        const wy = gridSY + ri * pitch * scale;

        // Clip to slide boundaries with 2mm margin
        if (wx < safeSX || wx > safeSX + safeW || wy < safeSY || wy > safeSY + safeH) continue;

        const stepIdx   = wellStepMap[id];
        const stepColor = stepIdx !== undefined ? STEP_COLORS[stepIdx % STEP_COLORS.length] : null;
        const darkC     = stepIdx !== undefined ? STEP_COLORS_DARK[stepIdx % STEP_COLORS_DARK.length] : null;
        const isSel     = selectedWells.has(id);
        const isLocked  = stepColor !== null;
        const fill      = stepColor || (isSel ? '#93c5fd' : '#dde3ea');

        wellMeta.current[id] = { cx: wx, cy: wy, r: dotR };

        points.push(
          <g key={id} onClick={() => !isLocked && onWellClick(id)} style={{ cursor: isLocked ? 'default' : 'pointer' }}>
            <circle cx={wx} cy={wy} r={dotR} fill={fill} stroke="none" />
          </g>
        );
        const isAssigned = stepIdx !== undefined;
        const centeredText = isAssigned ? `${stepVolumes[stepIdx]}µL` : id;
        const textColor = isAssigned ? darkC : "#94a3b8";
        const fs = isAssigned ? Math.min(dotR * 0.55, 3) : Math.min(dotR * 0.6, 2.8);

        volTexts.push(
          <text key={`txt-${id}`} x={wx} y={wy}
            fontSize={fs} fill={textColor} textAnchor="middle" dominantBaseline="middle"
            fontWeight={isAssigned ? "600" : "400"}
            style={{ pointerEvents: 'none', userSelect: 'none', opacity: isAssigned ? 1 : 0.8 }}>
            {centeredText}
          </text>
        );
      }
    }

    return (
      <svg viewBox={`0 0 ${PLATE_W} ${PLATE_H}`} width="100%" style={{ display: 'block' }}>
        {/* Main Slide Body */}
        <rect x={sx} y={sy} width={width * scale} height={height * scale} rx={1} fill="#eef2f7" stroke="#94a3b8" strokeWidth={1} />
        {/* Safety offset boundary (dashed) */}
        <rect x={safeSX} y={safeSY} width={safeW} height={safeH} rx={0.5} fill="none"
          stroke="#cbd5e1" strokeWidth={0.3} strokeDasharray="1 1" />
        {/* Cover slip area indication */}
        <rect x={sx + width * scale * 0.7} y={sy} width={width * scale * 0.3} height={height * scale}
          rx={1} fill="rgba(219,234,254,0.5)" stroke="#bfdbfe" strokeWidth={0.4} />
        <text x={sx + width * scale * 0.85} y={sy + height * scale + 3} fontSize={2} fill="#93c5fd" textAnchor="middle">cover slip</text>
        {points}
        {volTexts}
      </svg>
    );
  }
  return null;
};

// ── Drag-select hook ─────────────────────────────────────────────
const useDragSelect = (svgRef, wellMeta, lockedWells, selectedWells, setSelectedWells) => {
  const [rect, setRect] = useState(null);
  const start = useRef(null);

  const pt = (e) => {
    if (!svgRef.current) return null;
    const p = svgRef.current.createSVGPoint();
    p.x = e.clientX; p.y = e.clientY;
    return p.matrixTransform(svgRef.current.getScreenCTM().inverse());
  };

  const onMouseDown = (e) => {
    if (e.target.tagName === 'circle') return;
    const p = pt(e); if (!p) return;
    start.current = { x: p.x, y: p.y };
    setRect({ x: p.x, y: p.y, w: 0, h: 0 });
    e.preventDefault();
  };
  const onMouseMove = (e) => {
    if (!start.current) return;
    const p = pt(e); if (!p) return;
    setRect({ x: Math.min(start.current.x, p.x), y: Math.min(start.current.y, p.y), w: Math.abs(p.x - start.current.x), h: Math.abs(p.y - start.current.y) });
  };
  const onMouseUp = () => {
    if (!rect || !start.current) { start.current = null; setRect(null); return; }
    if (rect.w > 1 && rect.h > 1) {
      const next = new Set(selectedWells);
      Object.entries(wellMeta.current).forEach(([id, { cx, cy }]) => {
        if (lockedWells.has(id)) return;
        if (cx >= rect.x && cx <= rect.x + rect.w && cy >= rect.y && cy <= rect.y + rect.h) next.add(id);
      });
      setSelectedWells(next);
    }
    start.current = null; setRect(null);
  };
  return { rect, onMouseDown, onMouseMove, onMouseUp };
};

// ── Main Component ───────────────────────────────────────────────
const StepSequence = () => {
  const { selectedSubstrateId, sequenceSteps, setSequenceSteps, lockedWells, setLockedWells, virtualGridParams, setVirtualGridParams, nextStep, prevStep } = useWizard();
  const substrate = SUBSTRATE_TYPES[selectedSubstrateId];
  const [selectedWells, setSelectedWells] = useState(new Set());
  const [volume, setVolume] = useState('10');
  const [randomPercent, setRandomPercent] = useState(50);
  const [panelHeight, setPanelHeight] = useState(null);
  const svgRef = useRef(null);
  const wellMeta = useRef({});
  const fileRef = useRef(null);
  const plateRef = useRef(null);

  useEffect(() => {
    setSelectedWells(new Set());
    wellMeta.current = {};
    // Apply default virtual grid params if switching to a virtual substrate
    if (substrate.isVirtualGrid && VIRTUAL_GRID_DEFAULTS[selectedSubstrateId]) {
      setVirtualGridParams(VIRTUAL_GRID_DEFAULTS[selectedSubstrateId]);
    }
  }, [selectedSubstrateId]);

  // Clean up wells that fall outside the working area when virtual grid params change
  useEffect(() => {
    if (!substrate.isVirtualGrid) return;
    const validIds = computeValidWellIds(substrate, virtualGridParams);

    setSelectedWells(prev => {
      const next = new Set([...prev].filter(id => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });

    setSequenceSteps(prev => {
      let changed = false;
      const newSteps = prev.map(step => {
        const filtered = new Set([...step.wells].filter(id => validIds.has(id)));
        if (filtered.size !== step.wells.size) changed = true;
        return { ...step, wells: filtered };
      }).filter(step => {
        if (step.wells.size === 0) { changed = true; return false; }
        return true;
      });
      return changed ? newSteps : prev;
    });

    setLockedWells(prev => {
      const next = new Set([...prev].filter(id => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [virtualGridParams, selectedSubstrateId]);

  // Keep right panel height exactly matching the plate panel
  useLayoutEffect(() => {
    if (!plateRef.current) return;
    const updateHeight = () => {
      setPanelHeight(plateRef.current.getBoundingClientRect().height);
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(plateRef.current);
    return () => observer.disconnect();
  }, []);

  const handleWellClick = useCallback((id) => {
    setSelectedWells(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const stepWells = sequenceSteps.map(s => s.wells);
  const { rect, onMouseDown, onMouseMove, onMouseUp } = useDragSelect(svgRef, wellMeta, lockedWells, selectedWells, setSelectedWells);

  const addStep = () => {
    const valid = new Set([...selectedWells].filter(w => !lockedWells.has(w)));
    if (!valid.size) return;
    const vol = parseFloat(volume) || 10;
    setSequenceSteps(p => [...p, { id: Date.now().toString(), wells: valid, volume: vol }]);
    setLockedWells(p => { const n = new Set(p); valid.forEach(w => n.add(w)); return n; });
    setSelectedWells(new Set());
  };

  const deleteStep = (stepId) => {
    const step = sequenceSteps.find(s => s.id === stepId);
    if (!step) return;
    setSequenceSteps(p => p.filter(s => s.id !== stepId));
    setLockedWells(p => { const n = new Set(p); step.wells.forEach(w => n.delete(w)); return n; });
  };

  const moveStep = (idx, dir) => {
    const arr = [...sequenceSteps];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setSequenceSteps(arr);
    // rebuild locked wells to keep consistent
    const newLocked = new Set();
    arr.forEach(s => s.wells.forEach(w => newLocked.add(w)));
    setLockedWells(newLocked);
  };

  const updateVolume = (stepId, val) => {
    setSequenceSteps(p => p.map(s => s.id === stepId ? { ...s, volume: parseFloat(val) || s.volume } : s));
  };

  const clearAll = () => { setSequenceSteps([]); setLockedWells(new Set()); setSelectedWells(new Set()); };

  const selectAll = () => {
    const all = new Set(Object.keys(wellMeta.current).filter(w => !lockedWells.has(w)));
    setSelectedWells(all);
  };

  const selectRandom = (percentage) => {
    const ids = Object.keys(wellMeta.current).filter(w => !lockedWells.has(w));
    if (ids.length === 0) return;
    const clamped = Math.min(100, Math.max(0, percentage));
    const count = Math.round(ids.length * clamped / 100);
    const shuffled = [...ids];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setSelectedWells(new Set(shuffled.slice(0, count)));
  };

  const saveJSON = () => {
    const data = sequenceSteps.map(s => ({ wells: [...s.wells], volume: s.volume, id: s.id }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `secuencia_${selectedSubstrateId.toLowerCase()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const loadJSON = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        clearAll();
        const steps = data.map(s => ({ id: s.id || Date.now().toString(), wells: new Set(s.wells), volume: s.volume }));
        setSequenceSteps(steps);
        const locked = new Set(); steps.forEach(s => s.wells.forEach(w => locked.add(w)));
        setLockedWells(locked);
      } catch {}
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const totalDeposits = sequenceSteps.reduce((a, s) => a + s.wells.size, 0);
  const availableWells = Object.keys(wellMeta.current).length - lockedWells.size;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Virtual grid controls for non-multiwell */}
      {substrate.isVirtualGrid && (() => {
        // Count how many points fit inside the substrate area
        const totalDefined = virtualGridParams.n * virtualGridParams.n;
        const insideCount = Object.keys(wellMeta.current).length;
        return (
          <div className="glass-panel" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Cuadrícula de depósito</span>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
              <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', marginBottom: 0 }}>N (Filas/Cols)</span>
              <input type="number" min={1} max={30} value={virtualGridParams.n}
                onChange={e => { setVirtualGridParams(p => ({ ...p, n: parseInt(e.target.value) || 1 })); wellMeta.current = {}; }}
                style={{ width: '58px' }} />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
              <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', marginBottom: 0 }}>Espaciado (mm)</span>
              <input type="number" min={0.5} step={0.5} value={virtualGridParams.pitch}
                onChange={e => { setVirtualGridParams(p => ({ ...p, pitch: parseFloat(e.target.value) || 1 })); wellMeta.current = {}; }}
                style={{ width: '72px' }} />
            </label>

            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              <b style={{ color: 'var(--accent-primary)' }}>{insideCount}</b>/{totalDefined} puntos en área
            </span>
          </div>
        );
      })()}

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>

        {/* ── Left: SVG plate ─────────────────────────────── */}
        <div ref={plateRef} className="glass-panel" style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Plate toolbar */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '0.95rem', marginRight: 'auto' }}>{substrate.name}</span>
            <button className="btn-secondary" onClick={selectAll}>Sel. todo</button>
            <button className="btn-secondary" onClick={() => setSelectedWells(new Set())}>Limpiar sel.</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <input type="number" min={0} max={100} step={1} value={randomPercent}
                onChange={e => setRandomPercent(parseInt(e.target.value) || 0)}
                style={{ width: '44px', padding: '0.2rem 0.3rem', fontSize: '0.78rem', textAlign: 'center' }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>%</span>
              <button className="btn-secondary" onClick={() => selectRandom(randomPercent)}>Aleatorio</button>
            </div>
          </div>

          {/* SVG — drag-selectable */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'crosshair', minHeight: 0 }}>
            <svg ref={svgRef} viewBox={`0 0 ${PLATE_W} ${PLATE_H}`} width="100%"
              style={{ display: 'block', userSelect: 'none', maxHeight: '100%' }}
              onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
              <PlateRenderer substrate={substrate} selectedWells={selectedWells}
                stepWells={stepWells} stepVolumes={sequenceSteps.map(s => s.volume)}
                onWellClick={handleWellClick}
                wellMeta={wellMeta} virtualParams={virtualGridParams} />
              {rect && rect.w > 1 && (
                <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h}
                  fill="rgba(37,99,235,0.08)" stroke="#2563eb" strokeWidth={0.4} strokeDasharray="2 1" />
              )}
            </svg>
          </div>

          {/* Status bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span><b style={{ color: 'var(--accent-primary)' }}>{selectedWells.size}</b> seleccionado(s)</span>
            <span>{lockedWells.size} en secuencia · {availableWells} disponibles</span>
          </div>
        </div>

        {/* ── Right: Sequence panel ────────────────────────── */}
        <div style={{ 
          flex: '0 0 360px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.75rem', 
          height: panelHeight ? `${panelHeight}px` : '600px', 
          maxHeight: panelHeight ? `${panelHeight}px` : '600px',
          overflow: 'hidden' 
        }}>

          {/* Add step */}
          <div className="glass-panel" style={{ flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Droplets size={16} color="var(--accent-primary)" />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Añadir Paso</span>
              {selectedWells.size > 0 && (
                <span className="badge" style={{ marginLeft: 'auto' }}>{selectedWells.size} pozos</span>
              )}
            </div>
            <label>Volumen (µL)</label>
            <input type="number" min={0.1} step={0.5} value={volume}
              onChange={e => setVolume(e.target.value)}
              style={{ marginBottom: '0.75rem' }} />
            <button className="btn-primary" onClick={addStep} disabled={selectedWells.size === 0}
              style={{ width: '100%', justifyContent: 'center' }}>
              <Plus size={15} /> Confirmar Paso
            </button>
          </div>

          {/* Sequence list */}
          <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Secuencia</span>
              <span className="badge" style={{ whiteSpace: 'nowrap' }}>{sequenceSteps.length}p · {totalDeposits}dep.</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
                <button className="btn-icon" title="Cargar JSON" onClick={() => fileRef.current?.click()}><Upload size={13} /></button>
                <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={loadJSON} />
                {sequenceSteps.length > 0 && (
                  <button className="btn-icon" title="Guardar JSON" onClick={saveJSON}><Download size={13} /></button>
                )}
                {sequenceSteps.length > 0 && (
                  <button className="btn-icon-danger" title="Borrar todo" onClick={clearAll}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '1mm' }}>
              <AnimatePresence>
                {sequenceSteps.length === 0 && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
                    Seleccione pozos en la placa y confirme un paso.
                  </p>
                )}
                {sequenceSteps.map((step, i) => {
                  const color = STEP_COLORS[i % STEP_COLORS.length];
                  const darkColor = STEP_COLORS_DARK[i % STEP_COLORS_DARK.length];
                  const wells = [...step.wells].sort();
                  const preview = wells.slice(0, 6).join(' ') + (wells.length > 6 ? ` +${wells.length - 6}` : '');
                  return (
                    <motion.div key={step.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                      style={{ border: `1px solid ${color}`, borderLeft: `4px solid ${darkColor}`, borderRadius: 8, padding: '0.75rem', backgroundColor: `${color}40` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: darkColor, flexShrink: 0 }} />
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: darkColor }}>Paso {i + 1}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{step.wells.size} poz.</span>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px', flexShrink: 0 }}>
                          <button className="btn-icon" onClick={() => moveStep(i, -1)} disabled={i === 0}><ChevronUp size={11} /></button>
                          <button className="btn-icon" onClick={() => moveStep(i, 1)} disabled={i === sequenceSteps.length - 1}><ChevronDown size={11} /></button>
                          <button className="btn-icon-danger" onClick={() => deleteStep(step.id)}><Trash2 size={10} /></button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.45rem' }}>
                        <label style={{ marginBottom: 0, flexShrink: 0, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Vol µL:</label>
                        <input type="number" min={0.1} step={0.5} value={step.volume}
                          onChange={e => updateVolume(step.id, e.target.value)}
                          style={{ width: '80px', padding: '0.2rem 0.4rem', fontSize: '0.82rem' }} />
                      </div>
                      <div style={{ marginTop: '0.4rem', fontSize: '0.72rem', color: darkColor, fontFamily: 'monospace', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview}</div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn-secondary" onClick={prevStep}><ArrowLeft size={16} /> Atrás</button>
        <button className="btn-primary" onClick={nextStep} disabled={sequenceSteps.length === 0}>
          Generar G-code <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default StepSequence;

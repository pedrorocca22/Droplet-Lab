import React from 'react';
import { motion } from 'framer-motion';
import { useWizard } from '../context/WizardContext';
import { SUBSTRATE_TYPES } from '../utils/plateConfigs';
import { ArrowRight } from 'lucide-react';
import { PLATE_W, PLATE_H } from '../utils/plateConfigs';

const PreviewSVG = ({ substrate }) => {
  if (substrate.type === 'multiwell') {
    const { rows, cols, a1, pitch, wellDiameter } = substrate;
    const r = wellDiameter / 2;
    const wells = [];
    for (let ri = 0; ri < rows; ri++)
      for (let ci = 0; ci < cols; ci++)
        wells.push(<circle key={`${ri}-${ci}`} cx={a1.x + ci * pitch} cy={a1.y + ri * pitch} r={r}
          fill="#cbd5e1" stroke="#94a3b8" strokeWidth={0.3} />);
    return (
      <svg viewBox={`0 0 ${PLATE_W} ${PLATE_H}`} width="100%" style={{ display: 'block' }}>
        <rect x={0} y={0} width={PLATE_W} height={PLATE_H} rx={3} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={0.8} />
        {wells}
      </svg>
    );
  }
  if (substrate.type === 'petri') {
    const cx = PLATE_W / 2, cy = PLATE_H / 2, r = Math.min(PLATE_W, PLATE_H) * 0.43;
    return (
      <svg viewBox={`0 0 ${PLATE_W} ${PLATE_H}`} width="100%" style={{ display: 'block' }}>
        <rect x={0} y={0} width={PLATE_W} height={PLATE_H} rx={3} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={0.8} />
        <circle cx={cx} cy={cy} r={r} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1} />
        <circle cx={cx} cy={cy} r={r * 0.85} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={0.5} strokeDasharray="3 2" />
      </svg>
    );
  }
  const sw = PLATE_W * 0.8, sh = PLATE_H * 0.45, sx = PLATE_W * 0.1, sy = PLATE_H * 0.275;
  return (
    <svg viewBox={`0 0 ${PLATE_W} ${PLATE_H}`} width="100%" style={{ display: 'block' }}>
      <rect x={0} y={0} width={PLATE_W} height={PLATE_H} rx={3} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={0.8} />
      <rect x={sx} y={sy} width={sw} height={sh} rx={1} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={0.8} />
      <rect x={sx + sw * 0.72} y={sy} width={sw * 0.28} height={sh} fill="#dbeafe" stroke="#93c5fd" strokeWidth={0.5} />
    </svg>
  );
};

const StepBaseElement = () => {
  const { selectedSubstrateId, setSelectedSubstrateId, nextStep } = useWizard();

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.25rem' }}>Seleccione el Sustrato Base</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Elija el tipo de matriz donde se depositarán las gotas. Define el área de trabajo.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '0.875rem', marginBottom: '2rem' }}>
        {Object.values(SUBSTRATE_TYPES).map((sub) => {
          const isSelected = selectedSubstrateId === sub.id;
          return (
            <motion.div key={sub.id} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedSubstrateId(sub.id)}
              style={{ cursor: 'pointer', padding: '1rem', borderRadius: 12,
                border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                backgroundColor: isSelected ? 'var(--accent-primary-light)' : 'var(--bg-tertiary)',
                boxShadow: isSelected ? '0 0 0 3px rgba(37,99,235,0.12)' : 'none',
                transition: 'border-color 0.15s, background-color 0.15s' }}>
              <div style={{ marginBottom: '0.75rem', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                <PreviewSVG substrate={sub} />
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{sub.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                {sub.type === 'multiwell' ? `${sub.rows}×${sub.cols} • ${sub.pitch}mm pitch` : sub.isVirtualGrid ? 'Cuadrícula configurable' : ''}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-primary" onClick={nextStep}>Continuar <ArrowRight size={16} /></button>
      </div>
    </div>
  );
};

export default StepBaseElement;

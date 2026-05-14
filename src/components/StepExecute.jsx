import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWizard } from '../context/WizardContext';
import { SUBSTRATE_TYPES } from '../utils/plateConfigs';
import { generateGcode } from '../utils/gcodeGenerator';
import { sendLineAndWaitForOk } from '../utils/serialCommunication';
import { ArrowLeft, Download, Play, Square, TerminalSquare, CheckCircle, XCircle } from 'lucide-react';

const SIMULATION_DELAY_MS = 60;

const StepExecute = () => {
  const { sequenceSteps, config, selectedSubstrateId, virtualGridParams, serialState, prevStep } = useWizard();
  const substrate = SUBSTRATE_TYPES[selectedSubstrateId];

  const [gcode, setGcode] = useState('');
  const [gcodeGenerated, setGcodeGenerated] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [log, setLog] = useState([]);
  const [currentWell, setCurrentWell] = useState(null);
  const cancelRef = React.useRef(false);

  const addLog = (msg, type = 'info') => {
    const ts = new Date().toLocaleTimeString();
    setLog(prev => [...prev.slice(-200), { msg, type, ts }]);
  };

  const handleGenerate = () => {
    const code = generateGcode(sequenceSteps, config, substrate, virtualGridParams);
    setGcode(code);
    setGcodeGenerated(true);
    addLog('G-code generado correctamente.', 'success');
  };

  const handleDownload = () => {
    const blob = new Blob([gcode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `droplet_${selectedSubstrateId.toLowerCase()}.gcode`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSimulate = async () => {
    if (!gcode || isSimulating) return;
    setIsSimulating(true);
    setIsExecuting(false);
    cancelRef.current = false;
    setIsCancelled(false);
    setLog([]);
    addLog('Iniciando simulación…', 'info');

    const lines = gcode.split('\n');
    for (const line of lines) {
      if (cancelRef.current) { addLog('Simulación cancelada.', 'warn'); break; }
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('; WELL_TARGET:')) {
        setCurrentWell(trimmed.replace('; WELL_TARGET:', ''));
      }
      addLog(`(SIM) ${trimmed}`, trimmed.startsWith(';') ? 'comment' : 'send');
      await new Promise(r => setTimeout(r, SIMULATION_DELAY_MS));
    }

    if (!cancelRef.current) {
      addLog('Simulación completada.', 'success');
      setCurrentWell(null);
    }
    setIsSimulating(false);
  };

  const handleExecute = async () => {
    if (!gcode || !serialState.isConnected || isExecuting) return;
    setIsExecuting(true);
    setIsSimulating(false);
    cancelRef.current = false;
    setIsCancelled(false);
    setLog([]);
    addLog('Iniciando envío de G-code al CNC…', 'info');

    const lines = gcode.split('\n');
    for (const line of lines) {
      if (cancelRef.current) { addLog('Proceso cancelado.', 'warn'); break; }
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(';')) continue;
      try {
        addLog(`SEND: ${trimmed}`, 'send');
        const result = await sendLineAndWaitForOk(serialState.writer, serialState.serialReader, serialState.readBuffer || '', trimmed);
        addLog('ok ✓', 'ok');
      } catch (e) {
        addLog(`Error: ${e.message}`, 'error');
        break;
      }
    }
    if (!cancelRef.current) addLog('Ejecución completada.', 'success');
    setIsExecuting(false);
    setCurrentWell(null);
  };

  const handleCancel = () => {
    cancelRef.current = true;
    setIsCancelled(true);
    setIsSimulating(false);
    setIsExecuting(false);
    setCurrentWell(null);
  };

  const logColor = { info: '#94a3b8', success: '#10b981', warn: '#f59e0b', error: '#ef4444', send: '#60a5fa', ok: '#34d399', comment: '#475569' };
  const isRunning = isSimulating || isExecuting;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Header actions */}
      <div className="glass-panel" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={handleGenerate}>
          <TerminalSquare size={18} /> Generar G-code
        </button>
        {gcodeGenerated && (
          <>
            <button className="btn-secondary" onClick={handleDownload}>
              <Download size={18} /> Exportar .gcode
            </button>
            <button
              className="btn-purple"
              onClick={handleSimulate}
              disabled={isRunning}
            >
              <Play size={18} /> Simular
            </button>
            {serialState.isConnected && (
              <button
                className="btn-success"
                onClick={handleExecute}
                disabled={isRunning}
              >
                <Play size={18} /> Ejecutar en CNC
              </button>
            )}
            {isRunning && (
              <button className="btn-danger" onClick={handleCancel}>
                <Square size={18} /> Cancelar
              </button>
            )}
          </>
        )}

        {currentWell && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(59,130,246,0.15)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59,130,246,0.3)', fontSize: '0.875rem' }}
          >
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
              <CheckCircle size={16} color="var(--accent-primary)" />
            </motion.div>
            Posicionando: <strong>{currentWell}</strong>
          </motion.div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>

        {/* G-code editor */}
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', height: '32px', marginBottom: '0.75rem' }}>
            <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>Editor G-code</h3>
          </div>
          <div style={{ backgroundColor: '#070d1a', borderRadius: '4px', height: '480px', overflow: 'hidden' }}>
            <textarea
              value={gcode}
              onChange={e => setGcode(e.target.value)}
              placeholder="El G-code generado aparecerá aquí..."
              style={{
                width: '100%', height: '100%', resize: 'none',
                fontFamily: "'Courier New', monospace", fontSize: '0.8rem', lineHeight: 1.6,
                backgroundColor: 'transparent', color: '#94a3b8', border: 'none',
                outline: 'none', padding: '1rem 1.25rem 1rem 1rem'
              }}
            />
          </div>
        </div>

        {/* Console log */}
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '32px', marginBottom: '0.75rem' }}>
            <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>Consola</h3>
            {log.length > 0 && (
              <button className="btn-secondary" style={{ padding: '0.2rem 0.75rem', fontSize: '0.75rem' }} onClick={() => setLog([])}>Limpiar</button>
            )}
          </div>
          <div style={{
            height: '480px', overflowY: 'auto',
            backgroundColor: '#070d1a', borderRadius: '4px',
            padding: '1rem 1.25rem 1rem 1rem', 
            fontFamily: "'Courier New', monospace", fontSize: '0.75rem',
            border: 'none'
          }}>
            {log.length === 0 && <span style={{ color: '#475569' }}>Sin mensajes…</span>}
            {log.map((entry, i) => (
              <div key={i} style={{ color: logColor[entry.type] || '#94a3b8', marginBottom: '2px', display: 'flex', gap: '0.5rem' }}>
                <span style={{ color: '#334155', flexShrink: 0 }}>{entry.ts}</span>
                <span>{entry.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="glass-panel" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', fontSize: '0.875rem', color: 'var(--text-secondary)', alignItems: 'center' }}>
        <span><strong style={{ color: 'var(--text-primary)' }}>{sequenceSteps.length}</strong> paso(s)</span>
        <span><strong style={{ color: 'var(--text-primary)' }}>{[...sequenceSteps].reduce((acc, s) => acc + s.wells.size, 0)}</strong> depósitos totales</span>
        <span>Sustrato: <strong style={{ color: 'var(--text-primary)' }}>{substrate?.name}</strong></span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {serialState.isConnected
            ? <><CheckCircle size={14} color="var(--accent-success)" /> CNC conectado</>
            : <><XCircle size={14} color="var(--text-muted)" /> Sin conexión serial</>}
        </span>
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <button className="btn-secondary" onClick={prevStep}>
          <ArrowLeft size={18} /> Atrás
        </button>
      </div>
    </div>
  );
};

export default StepExecute;

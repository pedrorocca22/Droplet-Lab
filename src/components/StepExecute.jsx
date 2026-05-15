import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWizard } from '../context/WizardContext';
import { SUBSTRATE_TYPES } from '../utils/plateConfigs';
import { generateGcode } from '../utils/gcodeGenerator';
import { sendLineAndWaitForOk } from '../utils/serialCommunication';
import { ArrowLeft, Download, Play, Square, TerminalSquare, CheckCircle, XCircle, X } from 'lucide-react';

const SIMULATION_DELAY_MS = 200;

const StepExecute = () => {
  const { sequenceSteps, config, selectedSubstrateId, virtualGridParams, serialState, prevStep, goToStep, simState, setSimState, simReExecuteRef, simSpeedRef } = useWizard();
  const substrate = SUBSTRATE_TYPES[selectedSubstrateId];

  const [gcode, setGcode] = useState('');
  const [gcodeGenerated, setGcodeGenerated] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [log, setLog] = useState([]);
  const [currentWell, setCurrentWell] = useState(null);
  const cancelRef = React.useRef(false);
  const simLoopRef = useRef(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1);

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
    a.download = 'droplet_' + selectedSubstrateId.toLowerCase() + '.gcode';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseGcodeDeposits = (code) => {
    const lines = code.split('\n');
    const deposits = [];
    let currentStepIndex = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('; WELL_TARGET:')) {
        const wellId = trimmed.replace('; WELL_TARGET:', '');
        deposits.push({ wellId, stepIndex: currentStepIndex });
      }
      if (trimmed.startsWith('; Paso ') && trimmed.includes(',')) {
        const stepMatch = trimmed.match(/; Paso (\d+)/);
        if (stepMatch) {
          currentStepIndex = parseInt(stepMatch[1]) - 1;
        }
      }
    }
    return deposits;
  };

  const runSimulationLoop = useCallback(async (deposits, speed, onDone) => {
    for (let i = 0; i < deposits.length; i++) {
      if (cancelRef.current) {
        addLog('Simulacion cancelada.', 'warn');
        break;
      }

      const deposit = deposits[i];
      
      setSimState(prev => ({
        ...prev,
        currentWell: {
          wellId: deposit.wellId,
          stepIndex: deposit.stepIndex,
          depositIndex: i,
          totalDeposits: deposits.length,
        },
      }));

      const delay = SIMULATION_DELAY_MS / (speed || 1);
      await new Promise(r => { simLoopRef.current = setTimeout(r, delay); });

      setSimState(prev => ({
        ...prev,
        depositedWells: new Set([...prev.depositedWells, deposit.wellId]),
      }));
    }

    if (!cancelRef.current && onDone) {
      onDone();
    }
  }, []);

  const handleSimulate = useCallback(() => {
    if (!gcode || isSimulating) return;
    const deposits = parseGcodeDeposits(gcode);
    if (deposits.length === 0) {
      addLog('No se encontraron depositos en el G-code.', 'warn');
      return;
    }
    setSimSpeed(simState.speed || 1);
    setShowConfigModal(true);
  }, [gcode, isSimulating, simState.speed]);

  const handleStartSimulation = useCallback(async () => {
    setShowConfigModal(false);
    setIsSimulating(true);
    setIsExecuting(false);
    cancelRef.current = false;
    setIsCancelled(false);
    setLog([]);
    addLog('Iniciando simulacion visual...', 'info');

    const deposits = parseGcodeDeposits(gcode);
    if (deposits.length === 0) {
      addLog('No se encontraron depositos en el G-code.', 'warn');
      setIsSimulating(false);
      return;
    }

    setSimState({
      active: true,
      currentWell: null,
      depositedWells: new Set(),
      cancelled: false,
      speed: simSpeed,
    });

    goToStep(3);

    await new Promise(r => setTimeout(r, 300));

    await runSimulationLoop(deposits, simSpeed, () => {
      addLog('Simulacion completada.', 'success');
      setSimState(prev => ({ ...prev, active: false, currentWell: null }));
      setIsSimulating(false);
    });
  }, [gcode, isSimulating, simSpeed, setSimState, goToStep, runSimulationLoop]);

  const handleCancelSimulation = useCallback(() => {
    cancelRef.current = true;
    if (simLoopRef.current) clearTimeout(simLoopRef.current);
    
    setSimState({
      active: false,
      currentWell: null,
      depositedWells: new Set(),
      cancelled: false,
      speed: simState.speed,
    });
    setIsSimulating(false);
  }, [setSimState, simState.speed]);

  useEffect(() => {
    simReExecuteRef.current = async () => {
      cancelRef.current = false;
      setLog([]);
      addLog('Re-ejecutando simulacion...', 'info');

      const deposits = parseGcodeDeposits(gcode);
      if (deposits.length === 0) {
        addLog('No se encontraron depositos en el G-code.', 'warn');
        setIsSimulating(false);
        return;
      }

      setSimState(prev => ({
        ...prev,
        active: true,
        currentWell: null,
        depositedWells: new Set(),
        cancelled: false,
      }));

      await runSimulationLoop(deposits, simSpeedRef.current, () => {
        addLog('Simulacion completada.', 'success');
        setSimState(prev => ({ ...prev, active: false, currentWell: null }));
        setIsSimulating(false);
      });
    };
  });

  useEffect(() => {
    return () => {
      if (simLoopRef.current) clearTimeout(simLoopRef.current);
    };
  }, []);

  const handleExecute = async () => {
    if (!gcode || !serialState.isConnected || isExecuting) return;
    setIsExecuting(true);
    setIsSimulating(false);
    cancelRef.current = false;
    setIsCancelled(false);
    setLog([]);
    addLog('Iniciando envio de G-code al CNC...', 'info');

    const lines = gcode.split('\n');
    for (const line of lines) {
      if (cancelRef.current) { addLog('Proceso cancelado.', 'warn'); break; }
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(';')) continue;
      try {
        addLog('SEND: ' + trimmed, 'send');
        const result = await sendLineAndWaitForOk(serialState.writer, serialState.serialReader, serialState.readBuffer || '', trimmed);
        addLog('ok', 'ok');
      } catch (e) {
        addLog('Error: ' + e.message, 'error');
        break;
      }
    }
    if (!cancelRef.current) addLog('Ejecucion completada.', 'success');
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
              placeholder="El G-code generado aparecera aqui..."
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
            {log.length === 0 && <span style={{ color: '#475569' }}>Sin mensajes...</span>}
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
        <span><strong style={{ color: 'var(--text-primary)' }}>{[...sequenceSteps].reduce((acc, s) => acc + s.wells.size, 0)}</strong> depositos totales</span>
        <span>Sustrato: <strong style={{ color: 'var(--text-primary)' }}>{substrate?.name}</strong></span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {serialState.isConnected
            ? <><CheckCircle size={14} color="var(--accent-success)" /> CNC conectado</>
            : <><XCircle size={14} color="var(--text-muted)" /> Sin conexion serial</>}
        </span>
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <button className="btn-secondary" onClick={prevStep}>
          <ArrowLeft size={18} /> Atras
        </button>
      </div>

      {/* Simulation Config Modal */}
      {showConfigModal && (() => {
        const deposits = parseGcodeDeposits(gcode);
        const baseDelay = SIMULATION_DELAY_MS;
        const estimatedTime = Math.round(deposits.length * (baseDelay / simSpeed) / 1000);
        const speedOptions = [
          { speed: 0.1, label: 'Ultra lenta', delay: Math.round(baseDelay / 0.1) + 'ms' },
          { speed: 0.25, label: 'Muy lenta', delay: Math.round(baseDelay / 0.25) + 'ms' },
          { speed: 0.5, label: 'Lenta', delay: Math.round(baseDelay / 0.5) + 'ms' },
          { speed: 1, label: 'Normal', delay: baseDelay + 'ms' },
          { speed: 2, label: 'Rapida', delay: Math.round(baseDelay / 2) + 'ms' },
          { speed: 4, label: 'Ultra rapida', delay: Math.round(baseDelay / 4) + 'ms' },
        ];
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1000, backdropFilter: 'blur(4px)',
            }}
            onClick={() => setShowConfigModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--glass-bg, #1e293b)',
                border: '1px solid var(--glass-border, rgba(148,163,184,0.2))',
                borderRadius: 'var(--radius-lg, 16px)',
                padding: '2rem',
                maxWidth: '520px',
                width: '90%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1.2rem', margin: 0 }}>Configurar simulacion</h3>
                <button onClick={() => setShowConfigModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <X size={20} />
                </button>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: 0 }}>Selecciona la velocidad de reproduccion</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', margin: '1.5rem 0' }}>
                {speedOptions.map(opt => (
                  <button
                    key={opt.speed}
                    onClick={() => setSimSpeed(opt.speed)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
                      padding: '1rem 0.5rem',
                      border: simSpeed === opt.speed ? '2px solid var(--accent-primary, #2563eb)' : '2px solid var(--glass-border, rgba(148,163,184,0.2))',
                      borderRadius: 'var(--radius-md, 8px)',
                      background: simSpeed === opt.speed ? 'rgba(37,99,235,0.1)' : 'transparent',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    <strong style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>{opt.speed}x</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{opt.label}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{opt.delay}/deposito</span>
                  </button>
                ))}
              </div>
              
              <div style={{
                textAlign: 'center', padding: '0.75rem',
                background: 'rgba(37,99,235,0.05)', borderRadius: 'var(--radius-md, 8px)',
                marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)',
              }}>
                Tiempo estimado: ~{estimatedTime}s para {deposits.length} depositos
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setShowConfigModal(false)}>Cancelar</button>
                <button className="btn-primary" onClick={handleStartSimulation}>Iniciar simulacion</button>
              </div>
            </motion.div>
          </motion.div>
        );
      })()}
    </div>
  );
};

export default StepExecute;

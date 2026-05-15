import React, { useState } from 'react';
import { useWizard } from '../context/WizardContext';
import { connectSerial, disconnectSerial, sendLineAndWaitForOk } from '../utils/serialCommunication';
import { ArrowLeft, ArrowRight, Zap, Beaker } from 'lucide-react';

const InputGroup = ({ label, value, onChange, type = "number", step = "1", suffix }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{label}</label>
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input 
        type={type} 
        value={value} 
        onChange={onChange} 
        step={step}
        style={{ width: '100%', paddingRight: suffix ? '3rem' : '0.75rem' }} 
      />
      {suffix && <span style={{ position: 'absolute', right: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{suffix}</span>}
    </div>
  </div>
);

const StepConfig = () => {
  const { config, setConfig, serialState, nextStep, prevStep } = useWizard();
  const [isCalibratingZ, setIsCalibratingZ] = useState(false);
  const [eJogStep, setEJogStep] = useState(1);
  const [statusMsg, setStatusMsg] = useState("");

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const startZCalibration = async () => {
    if (!serialState.isConnected) {
      setStatusMsg("Error: Debe conectar la máquina primero.");
      return;
    }
    setIsCalibratingZ(true);
    setStatusMsg("Iniciando calibración... Homing y posicionando.");
    try {
      await sendLineAndWaitForOk(serialState.writer, serialState.serialReader, serialState.readBuffer, "G28");
      await sendLineAndWaitForOk(serialState.writer, serialState.serialReader, serialState.readBuffer, `G0 X100 Y100 F${config.xyFeedrate}`);
      setStatusMsg("Ejes posicionados en X100 Y100. Use los controles Z para ajustar.");
    } catch (e) {
      setStatusMsg("Error en calibración: " + e.message);
      setIsCalibratingZ(false);
    }
  };

  const handleJogZ = async (val) => {
    if (!serialState.isConnected) return;
    try {
      await sendLineAndWaitForOk(serialState.writer, serialState.serialReader, serialState.readBuffer, "G91");
      await sendLineAndWaitForOk(serialState.writer, serialState.serialReader, serialState.readBuffer, `G1 Z${val} F500`);
      await sendLineAndWaitForOk(serialState.writer, serialState.serialReader, serialState.readBuffer, "G90");
    } catch (e) {
      setStatusMsg("Error Jog Z: " + e.message);
    }
  };

  const handleJogE = async (direction) => {
    if (!serialState.isConnected) return;
    try {
      await sendLineAndWaitForOk(serialState.writer, serialState.serialReader, serialState.readBuffer, "G91");
      await sendLineAndWaitForOk(serialState.writer, serialState.serialReader, serialState.readBuffer, `G1 E${direction * eJogStep} F${config.extrusionFeedrate}`);
      await sendLineAndWaitForOk(serialState.writer, serialState.serialReader, serialState.readBuffer, "G90");
    } catch (e) {
      setStatusMsg("Error Jog E: " + e.message);
    }
  };

  const setZ0 = async () => {
    try {
      await sendLineAndWaitForOk(serialState.writer, serialState.serialReader, serialState.readBuffer, "G92 Z0");
      await sendLineAndWaitForOk(serialState.writer, serialState.serialReader, serialState.readBuffer, `G0 Z${config.zSafeHeight} F${config.zHopSpeed}`);
      setStatusMsg("Z0 fijado y cabezal elevado a altura segura.");
      setIsCalibratingZ(false);
    } catch (e) {
      setStatusMsg("Error al fijar Z0: " + e.message);
    }
  };

  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Configuración del Hardware</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Ajuste los parámetros físicos de la inyección y el movimiento de los ejes.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        
        {/* Movimiento */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Zap size={18} /> Movimiento (XY/Z)</h3>
          <InputGroup label="Feedrate XY" value={config.xyFeedrate} onChange={e => handleConfigChange('xyFeedrate', parseFloat(e.target.value))} suffix="mm/min" />
          <InputGroup label="Altura Z Segura (Salto)" value={config.zSafeHeight} onChange={e => handleConfigChange('zSafeHeight', parseFloat(e.target.value))} step="0.1" suffix="mm" />
          <InputGroup label="Velocidad Salto Z" value={config.zHopSpeed} onChange={e => handleConfigChange('zHopSpeed', parseFloat(e.target.value))} suffix="mm/min" />
        </div>

        {/* Extrusión */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Beaker size={18} /> Inyección / Jeringa</h3>
          <InputGroup label="Diámetro interno jeringa" value={config.syringeDiameter} onChange={e => handleConfigChange('syringeDiameter', parseFloat(e.target.value))} step="0.1" suffix="mm" />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Jog Extrusor Manual</span>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {[0.1, 1, 10].map(s => (
                <button key={s} className={eJogStep === s ? "btn-primary" : "btn-secondary"} 
                  style={{ flex: 1, padding: '0.2rem', fontSize: '0.75rem' }}
                  onClick={() => setEJogStep(s)}>{s}mm</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => handleJogE(-1)}>Retraer E-</button>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => handleJogE(1)}>Extruir E+</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <InputGroup label="Retracción" value={config.retractionValue} onChange={e => handleConfigChange('retractionValue', parseFloat(e.target.value))} step="0.1" suffix="mm" />
            <InputGroup label="Vel. Retracción" value={config.retractionSpeed} onChange={e => handleConfigChange('retractionSpeed', parseFloat(e.target.value))} suffix="mm/min" />
          </div>
          <InputGroup label="Pausa Post-Extrusión" value={config.postExtrusionPause} onChange={e => handleConfigChange('postExtrusionPause', parseInt(e.target.value))} suffix="ms" />
        </div>

      </div>

      <div className="glass-panel" style={{ background: 'rgba(139, 92, 246, 0.05)', borderColor: 'var(--accent-purple)', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--accent-purple)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Calibración Eje Z
          {!isCalibratingZ && <button className="btn-primary" style={{ marginLeft: 'auto', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={startZCalibration}>Iniciar Calibración</button>}
        </h3>
        
        {isCalibratingZ ? (
          <>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Ajuste la altura hasta rozar el sustrato.</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[-10, -1, -0.1, 0.1, 1, 10].map(val => (
                <button key={val} className="btn-secondary" onClick={() => handleJogZ(val)}>
                  {val > 0 ? `+${val}` : val} mm
                </button>
              ))}
              <div style={{ flex: 1 }}></div>
              <button className="btn-danger" style={{ padding: '0.4rem 1rem' }} onClick={() => setIsCalibratingZ(false)}>Cancelar</button>
              <button className="btn-success" style={{ padding: '0.4rem 1rem' }} onClick={setZ0}>Fijar Z0</button>
            </div>
          </>
        ) : (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Haga clic en iniciar para posicionar el cabezal y ajustar el punto cero.</p>
        )}
      </div>

      {statusMsg && (
        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: '2rem', fontSize: '0.875rem', border: '1px solid var(--border-color)' }}>
          {statusMsg}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn-secondary" onClick={prevStep}>
          <ArrowLeft size={18} /> Atrás
        </button>
        <button className="btn-primary" onClick={nextStep}>
          Continuar <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default StepConfig;

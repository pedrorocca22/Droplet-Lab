import React, { useState } from 'react';
import { useWizard } from '../context/WizardContext';
import { connectSerial, disconnectSerial, sendLineAndWaitForOk } from '../utils/serialCommunication';
import { ArrowLeft, ArrowRight, Usb, Zap, Beaker } from 'lucide-react';

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
  const { config, setConfig, serialState, setSerialState, nextStep, prevStep } = useWizard();
  const [isCalibratingZ, setIsCalibratingZ] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const toggleConnection = async () => {
    if (!serialState.isConnected) {
      try {
        const { port, writer, serialReader, readBuffer } = await connectSerial();
        setSerialState({ isConnected: true, port, writer, serialReader, readBuffer });
        setStatusMsg("Conectado correctamente.");
      } catch (err) {
        setStatusMsg("Error: " + err.message);
      }
    } else {
      await disconnectSerial(serialState.port, serialState.writer, serialState.serialReader);
      setSerialState({ isConnected: false, port: null, writer: null, serialReader: null, readBuffer: "" });
      setStatusMsg("Desconectado.");
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

  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Configuración del Hardware</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Ajuste los parámetros físicos de la inyección y el movimiento de los ejes.</p>
        </div>
        
        <button 
          className={serialState.isConnected ? "btn-success" : "btn-primary"} 
          onClick={toggleConnection}
        >
          <Usb size={18} />
          {serialState.isConnected ? "Desconectar CNC" : "Conectar Serial"}
        </button>
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
          <InputGroup label="Feedrate Extrusión" value={config.extrusionFeedrate} onChange={e => handleConfigChange('extrusionFeedrate', parseFloat(e.target.value))} suffix="mm/min" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <InputGroup label="Retracción" value={config.retractionValue} onChange={e => handleConfigChange('retractionValue', parseFloat(e.target.value))} step="0.1" suffix="mm" />
            <InputGroup label="Vel. Retracción" value={config.retractionSpeed} onChange={e => handleConfigChange('retractionSpeed', parseFloat(e.target.value))} suffix="mm/min" />
          </div>
          <InputGroup label="Pausa Post-Extrusión" value={config.postExtrusionPause} onChange={e => handleConfigChange('postExtrusionPause', parseInt(e.target.value))} suffix="ms" />
        </div>

      </div>

      {serialState.isConnected && (
        <div className="glass-panel" style={{ background: 'rgba(139, 92, 246, 0.1)', borderColor: 'var(--accent-purple)', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--accent-purple)', marginBottom: '1rem' }}>Calibración Eje Z</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Baje el eje Z hasta rozar el sustrato, luego fije el Z0.</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[-10, -1, -0.1, 0.1, 1, 10].map(val => (
              <button key={val} className="btn-secondary" onClick={() => handleJogZ(val)}>
                {val > 0 ? `+${val}` : val} mm
              </button>
            ))}
            <div style={{ flex: 1 }}></div>
            <button className="btn-success" onClick={() => sendLineAndWaitForOk(serialState.writer, serialState.serialReader, serialState.readBuffer, "G92 Z0")}>
              Fijar Z0
            </button>
          </div>
        </div>
      )}

      {statusMsg && (
        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: '2rem', fontSize: '0.875rem' }}>
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

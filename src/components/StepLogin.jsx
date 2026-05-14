import React, { useState } from 'react';
import { useWizard } from '../context/WizardContext';
import { connectSerial, disconnectSerial } from '../utils/serialCommunication';
import { ArrowRight, User, Usb, Info } from 'lucide-react';

const StepLogin = () => {
  const { userData, setUserData, serialState, setSerialState, nextStep } = useWizard();
  const [statusMsg, setStatusMsg] = useState("");

  const handleInputChange = (field, value) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  };

  const toggleConnection = async () => {
    if (!serialState.isConnected) {
      try {
        const { port, writer, serialReader, readBuffer } = await connectSerial();
        setSerialState({ isConnected: true, port, writer, serialReader, readBuffer });
        setStatusMsg("Máquina conectada correctamente.");
      } catch (err) {
        setStatusMsg("Error de conexión: " + err.message);
      }
    } else {
      await disconnectSerial(serialState.port, serialState.writer, serialState.serialReader);
      setSerialState({ isConnected: false, port: null, writer: null, serialReader: null, readBuffer: "" });
      setStatusMsg("Conexión finalizada.");
    }
  };

  const isFormValid = userData.firstName.trim() !== '' && userData.lastName.trim() !== '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <div style={{ 
          width: '64px', 
          height: '64px', 
          backgroundColor: 'var(--accent-primary-light)', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          margin: '0 auto 1.5rem auto'
        }}>
          <User size={32} color="var(--accent-primary)" />
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: '0.75rem' }}>Identificación de Usuario</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Por favor, ingrese sus datos para el seguimiento del ensayo y conecte con el equipo.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', textAlign: 'left', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label>Nombre</label>
            <input 
              type="text" 
              placeholder="Ej: Juan" 
              value={userData.firstName}
              onChange={e => handleInputChange('firstName', e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label>Apellido</label>
            <input 
              type="text" 
              placeholder="Ej: Pérez" 
              value={userData.lastName}
              onChange={e => handleInputChange('lastName', e.target.value)}
            />
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '1.5rem', 
          padding: '1.5rem',
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '2rem'
        }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                backgroundColor: serialState.isConnected ? 'var(--accent-success)' : 'var(--text-muted)' 
              }} />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {serialState.isConnected ? "Hardware Conectado" : "Hardware Desconectado"}
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              {serialState.isConnected ? "Listo para recibir comandos G-code." : "Conecte la placa controladora por USB."}
            </p>
          </div>
          <button 
            className={serialState.isConnected ? "btn-secondary" : "btn-primary"} 
            onClick={toggleConnection}
          >
            <Usb size={16} />
            {serialState.isConnected ? "Desconectar" : "Conectar Máquina"}
          </button>
        </div>

        {statusMsg && (
          <div style={{ 
            fontSize: '0.8rem', 
            color: statusMsg.includes("Error") ? 'var(--accent-danger)' : 'var(--accent-success)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem'
          }}>
            <Info size={14} /> {statusMsg}
          </div>
        )}

        <button 
          className="btn-primary" 
          onClick={nextStep}
          style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}
        >
          Acceder al Laboratorio <ArrowRight size={18} />
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Software Droplet Lab v1.0.0-beta · Sistema de seguimiento de laboratorio
      </p>
    </div>
  );
};

export default StepLogin;

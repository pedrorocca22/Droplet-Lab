import React, { createContext, useState, useContext, useRef } from 'react';
import { SUBSTRATE_TYPES, DEFAULT_CONFIG } from '../utils/plateConfigs';

const WizardContext = createContext();

export const useWizard = () => useContext(WizardContext);

export const WizardProvider = ({ children }) => {
  const [currentStep, setCurrentStep] = useState(1);
  
  // User Data (New Step 1)
  const [userData, setUserData] = useState({ firstName: '', lastName: '' });

  // State for Substrate Selection (Step 2)
  const [selectedSubstrateId, setSelectedSubstrateId] = useState(SUBSTRATE_TYPES.PLATE_96.id);
  const [virtualGridParams, setVirtualGridParams] = useState({ n: 6, pitch: 10 });
  const [customSubstrateParams, setCustomSubstrateParams] = useState({ 
    shape: 'rect', width: 100, height: 100, diameter: 100 
  });

  // State for Sequence (Step 3)
  const [sequenceSteps, setSequenceSteps] = useState([]);
  const [lockedWells, setLockedWells] = useState(new Set());

  // State for Configuration (Step 4)
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  // Serial Connection State
  const [serialState, setSerialState] = useState({
    isConnected: false,
    port: null,
    writer: null
  });

  // Simulation State
  const [simState, setSimState] = useState({
    active: false,
    currentWell: null,
    depositedWells: new Set(),
    cancelled: false,
    speed: 1,
  });

  const [simConfig, setSimConfig] = useState({
    show: false,
    selectedSpeed: 1,
  });

  const simReExecuteRef = useRef(null);
  const simSpeedRef = useRef(1);

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 5));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));
  const goToStep = (step) => setCurrentStep(step);

  const getSubstrateInfo = () => SUBSTRATE_TYPES[selectedSubstrateId];

  return (
    <WizardContext.Provider value={{
      currentStep, nextStep, prevStep, goToStep,
      userData, setUserData,
      selectedSubstrateId, setSelectedSubstrateId,
      virtualGridParams, setVirtualGridParams,
      customSubstrateParams, setCustomSubstrateParams,
      getSubstrateInfo,
      config, setConfig,
      sequenceSteps, setSequenceSteps,
      lockedWells, setLockedWells,
      serialState, setSerialState,
      simState, setSimState,
      simConfig, setSimConfig,
      simReExecuteRef,
      simSpeedRef,
    }}>
      {children}
    </WizardContext.Provider>
  );
};

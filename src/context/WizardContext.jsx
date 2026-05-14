import React, { createContext, useState, useContext } from 'react';
import { SUBSTRATE_TYPES, DEFAULT_CONFIG } from '../utils/plateConfigs';

const WizardContext = createContext();

export const useWizard = () => useContext(WizardContext);

export const WizardProvider = ({ children }) => {
  const [currentStep, setCurrentStep] = useState(1);
  
  // State for Substrate Selection (Step 1)
  const [selectedSubstrateId, setSelectedSubstrateId] = useState(SUBSTRATE_TYPES.PLATE_96.id);
  const [virtualGridParams, setVirtualGridParams] = useState({ n: 6, pitch: 10 });

  // State for Configuration (Step 2)
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  // State for Sequence (Step 3)
  const [sequenceSteps, setSequenceSteps] = useState([]);
  const [lockedWells, setLockedWells] = useState(new Set());

  // Serial Connection State
  const [serialState, setSerialState] = useState({
    isConnected: false,
    port: null,
    writer: null
  });

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));
  const goToStep = (step) => setCurrentStep(step);

  const getSubstrateInfo = () => SUBSTRATE_TYPES[selectedSubstrateId];

  return (
    <WizardContext.Provider value={{
      currentStep, nextStep, prevStep, goToStep,
      selectedSubstrateId, setSelectedSubstrateId,
      virtualGridParams, setVirtualGridParams,
      getSubstrateInfo,
      config, setConfig,
      sequenceSteps, setSequenceSteps,
      lockedWells, setLockedWells,
      serialState, setSerialState
    }}>
      {children}
    </WizardContext.Provider>
  );
};

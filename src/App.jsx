import React from 'react';
import { WizardProvider } from './context/WizardContext';
import WizardLayout from './components/WizardLayout';

function App() {
  return (
    <WizardProvider>
      <WizardLayout />
    </WizardProvider>
  );
}

export default App;

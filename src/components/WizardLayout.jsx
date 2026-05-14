import React from 'react';
import { useWizard } from '../context/WizardContext';
import { User, Beaker, Settings, List, Play } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import StepLogin from './StepLogin';
import StepBaseElement from './StepBaseElement';
import StepConfig from './StepConfig';
import StepSequence from './StepSequence';
import StepExecute from './StepExecute';

const STEPS = [
  { num: 1, title: 'Login', icon: User },
  { num: 2, title: 'Sustrato', icon: Beaker },
  { num: 3, title: 'Configuración', icon: Settings },
  { num: 4, title: 'Secuencia', icon: List },
  { num: 5, title: 'Ejecución', icon: Play },
];

const stepVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

const WizardLayout = () => {
  const { currentStep } = useWizard();

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <StepLogin />;
      case 2: return <StepBaseElement />;
      case 3: return <StepConfig />;
      case 4: return <StepSequence />;
      case 5: return <StepExecute />;
      default: return <StepLogin />;
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem 2rem 4rem' }}>

      {/* Stepper */}
      <div className="glass-panel" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center' }}>
        <div style={{ marginRight: '1.5rem', fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-primary)', letterSpacing: '-0.5px' }}>
          Droplet Lab
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.num;
            const isPast   = currentStep > step.num;

            return (
              <React.Fragment key={step.num}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isActive || isPast ? 1 : 0.4 }}>
                  <motion.div initial={false}
                    animate={{
                      backgroundColor: isActive ? '#2563eb' : isPast ? '#059669' : '#e2e8f0',
                      scale: isActive ? 1.08 : 1,
                      boxShadow: isActive ? '0 0 0 3px rgba(37,99,235,0.2)' : 'none',
                    }}
                    transition={{ duration: 0.25 }}
                    style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: isActive || isPast ? '#fff' : '#94a3b8', flexShrink: 0 }}>
                    <Icon size={16} />
                  </motion.div>
                  <span style={{ fontSize: '0.82rem', fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--text-primary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {step.title}
                  </span>
                </div>

                {index < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, backgroundColor: '#e2e8f0', margin: '0 0.75rem', borderRadius: 2, overflow: 'hidden', position: 'relative', minWidth: 20 }}>
                    <motion.div initial={{ width: '0%' }} animate={{ width: isPast ? '100%' : '0%' }}
                      transition={{ duration: 0.4 }}
                      style={{ position: 'absolute', inset: 0, backgroundColor: '#059669' }} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div key={currentStep} variants={stepVariants} initial="initial" animate="animate" exit="exit">
          {renderStep()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default WizardLayout;

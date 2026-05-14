export const DEFAULT_X_A1_MACHINE = 9; 
export const DEFAULT_Y_A1_MACHINE = 9; 
export const DEFAULT_Z_FEEDRATE_SLOW = 300;

export const getWellCoordinates = (wellId, currentRows, currentCols, currentPitchX, currentPitchY, startX = DEFAULT_X_A1_MACHINE, startY = DEFAULT_Y_A1_MACHINE) => {
    if (!wellId || wellId.length < 2) return null;
    const rowChar = wellId.charAt(0).toUpperCase();
    const colStr = wellId.substring(1);
    const rowIndex = rowChar.charCodeAt(0) - 65; 
    const colIndex = parseInt(colStr, 10) - 1;   
    if (rowIndex < 0 || rowIndex >= currentRows || colIndex < 0 || colIndex >= currentCols || isNaN(colIndex)) { return null; }
    
    const targetX = startX + (colIndex * currentPitchX);
    const targetY = startY - (rowIndex * currentPitchY); 
    return { x: targetX, y: targetY };
}

export const generateGcode = (sequenceSteps, config, substrateInfo, virtualGridParams) => {
    if (!sequenceSteps || sequenceSteps.length === 0) return "";

    const {
        syringeDiameter,
        xyFeedrate,
        zSafeHeight,
        zHopSpeed,
        retractionValue,
        retractionSpeed,
        extrusionFeedrate,
        postExtrusionPause,
        customPreGcode,
        customPostGcode
    } = config;

    const currentZ0Dispense = 0; 
    const currentZFeedrateSlow = DEFAULT_Z_FEEDRATE_SLOW;

    const syringeRadiusMm = syringeDiameter / 2;
    const syringeAreaMm2 = Math.PI * Math.pow(syringeRadiusMm, 2);

    let generatedGcode = "T0 ; Seleccionar herramienta 0\n";
    generatedGcode += "G21 ; Establecer unidades a milimetros\n";
    generatedGcode += "G90 ; Establecer modo de coordenadas absolutas\n";
    
    if (customPreGcode) {
        generatedGcode += `; --- PRE G-CODE USUARIO ---\n`;
        generatedGcode += customPreGcode + "\n";
        generatedGcode += `; --- FIN PRE G-CODE USUARIO ---\n`;
    }
    
    // Config de grilla
    const isVirtual = substrateInfo.isVirtualGrid;
    const rows = isVirtual ? virtualGridParams.n : substrateInfo.rows;
    const cols = isVirtual ? virtualGridParams.n : substrateInfo.cols;
    const pitchX = isVirtual ? virtualGridParams.pitch : substrateInfo.pitch;
    const pitchY = isVirtual ? virtualGridParams.pitch : substrateInfo.pitch;
    const startX = DEFAULT_X_A1_MACHINE;
    const startY = DEFAULT_Y_A1_MACHINE;

    for (let stepIndex = 0; stepIndex < sequenceSteps.length; stepIndex++) {
        const step = sequenceSteps[stepIndex];
        const wellsInStep = Array.from(step.wells);

        const volumeMicroLiters = step.volume; 
        const volumeCubicMm = volumeMicroLiters; 
        const linearDispenseMm = volumeCubicMm / syringeAreaMm2;

        for (let i = 0; i < wellsInStep.length; i++) {
            const wellId = wellsInStep[i];
            const coords = getWellCoordinates(wellId, rows, cols, pitchX, pitchY, startX, startY);
            if (!coords) { generatedGcode += `; ERROR: Coordenadas no encontradas para ${wellId}\n`; continue; }
            
            generatedGcode += `; WELL_TARGET:${wellId}\n`; 
            generatedGcode += `; Paso ${stepIndex + 1}, Punto ${wellId}, Volumen ${volumeMicroLiters} uL (E=${linearDispenseMm.toFixed(4)}mm)\n`;
            
            generatedGcode += `G1 X${coords.x.toFixed(3)} Y${coords.y.toFixed(3)} F${xyFeedrate.toFixed(3)}\n`; 
            generatedGcode += `G1 Z${currentZ0Dispense.toFixed(3)} F${currentZFeedrateSlow.toFixed(3)}\n`; 
                                
            if (retractionValue > 0) { 
                generatedGcode += `G1 E${retractionValue.toFixed(3)} F${retractionSpeed.toFixed(3)} ; Prime/De-retraccion\n`;
            }
            
            generatedGcode += `G1 E${linearDispenseMm.toFixed(4)} F${extrusionFeedrate.toFixed(3)} ; Dispensar\n`; 
            
            if (postExtrusionPause > 0) { 
                generatedGcode += `G4 P${postExtrusionPause} ; Pausa Post-Extrusion\n`;
            }

            generatedGcode += `G1 Z${zSafeHeight.toFixed(3)} F${zHopSpeed.toFixed(3)}\n`; 

            if (retractionValue > 0) {
                generatedGcode += `G1 E-${retractionValue.toFixed(3)} F${retractionSpeed.toFixed(3)} ; Retraer\n`;
            }
        }
    }

    if (customPostGcode) {
        generatedGcode += `; --- POST G-CODE USUARIO ---\n`;
        generatedGcode += customPostGcode + "\n";
        generatedGcode += `; --- FIN POST G-CODE USUARIO ---\n`;
    } else {
        generatedGcode += `G0 X${DEFAULT_X_A1_MACHINE.toFixed(3)} Y${DEFAULT_Y_A1_MACHINE.toFixed(3)} F${xyFeedrate.toFixed(3)} ; Mover a posicion de descanso\n`;
    }
    
    return generatedGcode;
}

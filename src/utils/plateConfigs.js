// Physical SBS plate dimensions (mm) — used as SVG viewBox
export const PLATE_W = 127.76;
export const PLATE_H = 85.48;

// A1 center is always at center of plate minus half the grid span
// a1X = PLATE_W/2 - ((cols-1)/2)*pitch
// a1Y = PLATE_H/2 - ((rows-1)/2)*pitch
const a1 = (cols, rows, pitch) => ({
  x: PLATE_W / 2 - ((cols - 1) / 2) * pitch,
  y: PLATE_H / 2 - ((rows - 1) / 2) * pitch,
});

export const VIRTUAL_GRID_DEFAULTS = {
  PETRI_60: { n: 4, pitch: 7  },
  PETRI_90: { n: 6, pitch: 10 },
  SLIDE:    { n: 4, pitch: 8  },
};

export const SUBSTRATE_TYPES = {
  PLATE_6: {
    id: 'PLATE_6', type: 'multiwell', name: 'Placa 6 Pocillos',
    rows: 2, cols: 3, pitch: 39.12, wellDiameter: 35.4,
    get a1() { return a1(this.cols, this.rows, this.pitch); }
  },
  PLATE_12: {
    id: 'PLATE_12', type: 'multiwell', name: 'Placa 12 Pocillos',
    rows: 3, cols: 4, pitch: 26.01, wellDiameter: 22.1,
    get a1() { return a1(this.cols, this.rows, this.pitch); }
  },
  PLATE_24: {
    id: 'PLATE_24', type: 'multiwell', name: 'Placa 24 Pocillos',
    rows: 4, cols: 6, pitch: 19.30, wellDiameter: 15.6,
    get a1() { return a1(this.cols, this.rows, this.pitch); }
  },
  PLATE_48: {
    id: 'PLATE_48', type: 'multiwell', name: 'Placa 48 Pocillos',
    rows: 6, cols: 8, pitch: 13.08, wellDiameter: 11.0,
    get a1() { return a1(this.cols, this.rows, this.pitch); }
  },
  PLATE_96: {
    id: 'PLATE_96', type: 'multiwell', name: 'Placa 96 Pocillos',
    rows: 8, cols: 12, pitch: 9.00, wellDiameter: 6.35,
    get a1() { return a1(this.cols, this.rows, this.pitch); }
  },
  PLATE_384: {
    id: 'PLATE_384', type: 'multiwell', name: 'Placa 384 Pocillos',
    rows: 16, cols: 24, pitch: 4.50, wellDiameter: 3.0,
    get a1() { return a1(this.cols, this.rows, this.pitch); }
  },
  PETRI_60: {
    id: 'PETRI_60', type: 'petri', name: 'Petri 60mm',
    isVirtualGrid: true, diameter: 54
  },
  PETRI_90: {
    id: 'PETRI_90', type: 'petri', name: 'Petri 90mm',
    isVirtualGrid: true, diameter: 84
  },
  SLIDE: {
    id: 'SLIDE', type: 'slide', name: 'Portaobjetos',
    isVirtualGrid: true, width: 75, height: 25
  }
};

export const STEP_COLORS = [
  '#93c5fd', // pastel blue
  '#fca5a5', // pastel red
  '#6ee7b7', // pastel green
  '#fcd34d', // pastel amber
  '#c4b5fd', // pastel purple
  '#67e8f9', // pastel cyan
  '#fdba74', // pastel orange
  '#f9a8d4', // pastel pink
  '#bef264', // pastel lime
  '#a5b4fc', // pastel indigo
];

// Darker stroke version of pastel colors (for borders/text contrast)
export const STEP_COLORS_DARK = [
  '#1d4ed8','#b91c1c','#047857','#b45309',
  '#6d28d9','#0e7490','#c2410c','#be185d',
  '#4d7c0f','#3730a3'
];

export const DEFAULT_CONFIG = {
  xyFeedrate: 3000,
  zSafeHeight: 10,
  zHopSpeed: 1500,
  syringeDiameter: 12.7,
  extrusionFeedrate: 200,
  retractionValue: 1.0,
  retractionSpeed: 1800,
  postExtrusionPause: 100,
  customPreGcode: 'G28 X Y Z\nM82',
  customPostGcode: 'G0 X0 Y0\nM84'
};

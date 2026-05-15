
# Droplet Lab

**Control Interface for Precision Biomaterial Deposition**

Droplet Lab is a professional web application designed to orchestrate the deposition of hydrogels, biomaterials, and chemical compounds onto standard laboratory substrates. From multiwell plates to petri dishes, Droplet Lab provides a seamless, wizard-driven workflow to configure sequences and generate G-code for automated dispensing systems.

> [!WARNING]
> **Beta Version in Development**: This software is currently in an active development phase. Always verify G-code paths in a simulator before running on physical hardware to prevent nozzle or substrate damage.

<img width="1912" height="913" alt="Droplet-lab2" src="https://github.com/user-attachments/assets/c831f3df-da13-4784-a6e5-8e538f063929" />

---

## Main Features

- **Guided Wizard Workflow**: A structured 5-step process designed for laboratory environments:
  1. **Login & Identification**: User traceability and centralized hardware connection.
  2. **Substrate Selection**: Support for standard SBS multiwell plates and fully custom platforms.
  3. **Sequence Designer**: Interactive visual selection of deposition points with volume tracking.
  4. **Machine Configuration**: Physical parameter adjustments and interactive Z-axis calibration.
  5. **Execution & Monitoring**: Real-time G-code terminal and symmetric console monitoring.

- **Precision Visualization**:
    - **SBS Compliance**: Exact physical dimensions for all standard plates.
    - **Custom Platforms**: Support for user-defined rectangular or circular substrates with dynamic safety boundaries.
    - **Virtual Grids**: Dynamic generation of deposition points for Petri dishes and bespoke containers.

- **Hardware Control**:
    - **Interactive Calibration**: Automated homing and positioning for Z-zero calibration.
    - **Manual Jogging**: Fine-grained Z-axis adjustment and manual extruder control for syringe priming.
    - **Web Serial API**: Direct browser-to-machine communication without external drivers.

<img width="1919" height="917" alt="Droplet-lab1" src="https://github.com/user-attachments/assets/a2eb13c8-8e4f-416f-b844-81ae01e27d25" />

---

## Supported Substrates

| Type | Format | Features |
| :--- | :--- | :--- |
| **Multiwell Plates** | 6, 12, 24, 48, 96, 384 | SBS Standard dimensions, A1-anchored |
| **Petri Dishes** | 60mm, 90mm | Centered virtual grid, 5mm safety offset |
| **Custom Platforms** | Rect / Circle | Fully configurable dimensions and safe zones |
| **Slides** | 75x25mm | Virtual grid, cover slip area indication |


https://github.com/user-attachments/assets/2055fae3-f98e-49e9-a95d-7224c9ab996e

---

## Usage Notes

This project is developed for research and laboratory automation purposes. It is recommended for use in modern browsers with Web Serial support (Chrome, Edge, Opera).

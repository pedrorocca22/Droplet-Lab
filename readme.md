# Droplet Lab

**Control Interface for Precision Biomaterial Deposition**

Droplet Lab is a professional web application designed to orchestrate the deposition of hydrogels, biomaterials, and chemical compounds onto standard laboratory substrates. From multiwell plates to petri dishes, Droplet Lab provides a seamless, wizard-driven workflow to configure sequences and generate G-code for automated dispensing systems.

> [!WARNING]
> **Versión Beta en Desarrollo**: Este software se encuentra en fase activa de desarrollo. Verifique siempre las rutas de G-code en un simulador antes de ejecutar en hardware físico para evitar daños en la boquilla o el sustrato.

---

## Características Principales

- **Flujo de Trabajo Guiado**: Un proceso estructurado de 5 pasos diseñado para entornos de laboratorio:
  1. **Login e Identificación**: Trazabilidad de usuario y conexión centralizada de hardware.
  2. **Selección de Sustrato**: Soporte para placas multiwell SBS estándar y plataformas totalmente personalizadas.
  3. **Diseñador de Secuencias**: Selección visual interactiva de puntos de deposición con seguimiento de volumen.
  4. **Configuración de Máquina**: Ajuste de parámetros físicos, velocidades y calibración interactiva del eje Z.
  5. **Ejecución y Monitoreo**: Terminal de G-code en tiempo real y monitoreo de consola simétrico.

- **Visualización de Precisión**:
    - **Cumplimiento SBS**: Dimensiones físicas exactas para todas las placas estándar.
    - **Plataformas Personalizadas**: Soporte para sustratos rectangulares o circulares definidos por el usuario con zonas de seguridad dinámicas.
    - **Cuadrículas Virtuales**: Generación dinámica de puntos de deposición para placas Petri y contenedores a medida.

- **Control de Hardware**:
    - **Calibración Interactiva**: Homing automatizado y posicionamiento para calibración de punto cero.
    - **Movimiento Manual (Jogging)**: Ajuste fino del eje Z y control manual del extrusor para purgado de jeringa.
    - **Web Serial API**: Comunicación directa desde el navegador a la máquina sin necesidad de drivers externos.

---

## Sustratos Soportados

| Tipo | Formato | Características |
| :--- | :--- | :--- |
| **Placas Multiwell** | 6, 12, 24, 48, 96, 384 | Dimensiones estándar SBS, anclaje en A1 |
| **Placas Petri** | 60mm, 90mm | Cuadrícula virtual centrada, margen de seguridad de 5mm |
| **Plataformas Custom** | Rect / Círculo | Dimensiones y zonas de seguridad totalmente configurables |
| **Portaobjetos** | 75x25mm | Cuadrícula virtual, indicación de área de cubreobjetos |

---

## Notas de Uso

Este proyecto ha sido desarrollado con fines de investigación y automatización de laboratorio. Se recomienda su uso en navegadores modernos con soporte para Web Serial (Chrome, Edge, Opera).

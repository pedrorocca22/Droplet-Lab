# Control CNC de Gotas

Este proyecto es una interfaz de usuario basada en navegador para controlar un sistema de dispensación de gotas CNC, ideal para aplicaciones de laboratorio como la preparación de placas de pocillos. Permite a los usuarios definir secuencias de dispensación, generar G-code y ejecutarlo a través de una conexión serie.

## Características

*   **Conexión Serie**: Conéctate a tu dispositivo CNC a través de la API Web Serial.
*   **Calibración del Eje Z**: Calibra con precisión la altura del eje Z para una dispensación óptima.
*   **Selección de Placa de Pocillos**: Soporte para placas de 96 y 384 pocillos, con configuración dinámica de la cuadrícula.
*   **Selección Interactiva de Pocillos**: Selecciona pocillos individualmente o arrastrando un rectángulo de selección.
*   **Definición de Secuencia**: Crea pasos de dispensación especificando los pocillos seleccionados y el volumen (µL).
*   **Gestión de Secuencias**: Añade, edita, elimina y reordena los pasos de la secuencia. Los pocillos utilizados en la secuencia se "bloquean" para evitar su reutilización accidental.
*   **Generación de G-code**: Convierte la secuencia definida en G-code estándar para el control del CNC.
*   **Editor de G-code**: Visualiza, edita y carga G-code manualmente.
*   **Simulación y Ejecución**: Simula el proceso de dispensación o ejecuta el G-code real a través de la conexión serie.
*   **Configuración Personalizable**: Ajusta parámetros clave como el diámetro de la jeringa, las velocidades de avance (feedrates) para movimientos XY y Z, los valores de retracción y las pausas post-extrusión.
*   **Jog Manual del Extrusor**: Controla manualmente el extrusor para purgar o cebar.
*   **G-code Personalizado**: Añade comandos G-code personalizados al inicio y al final de la secuencia generada.
*   **Soporte Multilingüe**: Interfaz disponible en español e inglés.
*   **Guardar/Cargar Secuencias**: Guarda y carga tus secuencias de dispensación como archivos JSON.

## Tecnologías Utilizadas

*   **HTML5**: Estructura de la interfaz de usuario.
*   **CSS (Tailwind CSS)**: Estilos y diseño responsivo.
*   **JavaScript**: Lógica de la aplicación, interacción con el DOM y generación de G-code.
*   **Web Serial API**: Para la comunicación directa con el hardware CNC.

## Cómo Usar

1.  **Abrir la Aplicación**: Abre el archivo `droplet.html` en un navegador web compatible (se recomienda Google Chrome para la API Web Serial).
2.  **Conectar al Dispositivo**: Haz clic en "Conectar Serie" para establecer una conexión con tu dispositivo CNC. Es posible que se te pida que selecciones el puerto serie.
3.  **Calibrar Z (Opcional pero Recomendado)**: Si tu dispositivo lo requiere, haz clic en "Calibrar Z" y usa los controles para ajustar la altura del eje Z hasta que la punta toque suavemente la superficie de la placa. Luego, haz clic en "Fijar Z0".
4.  **Seleccionar Tipo de Placa**: Elige entre "Placa 96" o "Placa 384" según la placa que estés utilizando.
5.  **Definir Secuencia**:
    *   Selecciona los pocillos en la cuadrícula haciendo clic individualmente o arrastrando un rectángulo de selección.
    *   Introduce el volumen deseado (en µL) en el campo "Volumen (µL)".
    *   Haz clic en "Añadir Paso" para añadir los pocillos seleccionados y el volumen a la secuencia.
    *   Puedes editar o eliminar pasos existentes en la lista de secuencia.
6.  **Configurar Parámetros (Pestaña "CONFIGURACION")**: Ajusta los parámetros de movimiento y extrusión según las especificaciones de tu jeringa y dispositivo.
7.  **Generar G-code**: Haz clic en "Generar y Ver G-code" (disponible en las pestañas "SECUENCIA" y "CONFIGURACION") para crear el G-code a partir de tu secuencia definida. Esto te llevará a la pestaña "G-CODE".
8.  **Simular o Ejecutar**:
    *   En la pestaña "G-CODE", puedes revisar el G-code generado.
    *   Haz clic en "Simular G-code Actual" para ver una simulación del proceso sin enviar comandos al hardware.
    *   Haz clic en "Ejecutar G-code Actual" para enviar el G-code a tu dispositivo CNC.
    *   Puedes cancelar un proceso en curso haciendo clic en "Cancelar Proceso".
9.  **Guardar/Cargar Secuencias**: Utiliza los botones "Guardar Secuencia" y "Cargar Secuencia" para guardar y reutilizar tus configuraciones de dispensación.

## Compatibilidad

La API Web Serial es una tecnología web relativamente nueva y solo es compatible con navegadores basados en Chromium (como Google Chrome, Microsoft Edge, Opera) en sistemas de escritorio. No es compatible con Firefox, Safari o la mayoría de los navegadores móviles.

## Desarrollo

Este proyecto es una aplicación de una sola página (`droplet.html`) que utiliza JavaScript puro para la lógica y Tailwind CSS para los estilos. No requiere un proceso de construcción complejo; simplemente abre el archivo HTML en tu navegador.

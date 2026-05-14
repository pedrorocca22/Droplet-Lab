// Utilidades para la comunicación Serie

export const connectSerial = async (baudRate = 115200) => {
    if (!("serial" in navigator)) {
        throw new Error("Web Serial API no soportada por el navegador.");
    }
    
    try {
        const port = await navigator.serial.requestPort();
        await port.open({ baudRate });
        const writer = port.writable.getWriter();
        let serialReader = null;
        let readBuffer = "";
        
        if (port.readable) {
            serialReader = port.readable.getReader();
        }
        
        return { port, writer, serialReader, readBuffer };
    } catch (err) {
        throw new Error("Error al conectar al puerto serie: " + err.message);
    }
};

export const disconnectSerial = async (port, writer, serialReader) => {
    try {
        if (serialReader) {
            await serialReader.cancel().catch(() => {});
            serialReader.releaseLock();
        }
        if (writer) {
            writer.releaseLock();
        }
        if (port) {
            await port.close().catch(() => {});
        }
    } catch (err) {
        console.error("Error desconectando: ", err);
    }
};

export const waitForOk = async (serialReader, readBuffer, timeoutMs = 10000) => {
    const textDecoder = new TextDecoder();
    return new Promise(async (resolve, reject) => {
        if (!serialReader) {
            reject(new Error("Lector serie no disponible."));
            return;
        }
        const startTime = Date.now();
        const checkBuffer = () => {
            const okIndex = readBuffer.indexOf("ok");
            if (okIndex !== -1) {
                readBuffer = readBuffer.substring(okIndex + 2);
                resolve({ success: true, newBuffer: readBuffer });
                return true;
            }
            return false;
        };
        
        if (checkBuffer()) return;
        
        try {
            while (Date.now() - startTime < timeoutMs) {
                const { value, done } = await serialReader.read();
                if (done) {
                    reject(new Error("Puerto serie cerrado mientras se esperaba."));
                    return;
                }
                readBuffer += textDecoder.decode(value, { stream: true });
                if (checkBuffer()) return;
                await new Promise(p => setTimeout(p, 20));
            }
            reject(new Error("Timeout esperando 'ok' de la impresora."));
        } catch (e) {
            reject(e);
        }
    });
};

export const sendLineAndWaitForOk = async (writer, serialReader, readBuffer, line, timeoutMs = 10000) => {
    if (!writer || !serialReader) {
        throw new Error("Conexión no activa.");
    }
    await writer.write(new TextEncoder().encode(line + '\n'));
    return await waitForOk(serialReader, readBuffer, timeoutMs);
};

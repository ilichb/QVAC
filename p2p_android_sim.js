import { WebSocketServer } from 'ws';

const PORT = 8080;
const HOST = '192.168.1.50';

const server = new WebSocketServer({ host: HOST, port: PORT });
console.log(`Nodo Android simulado escuchando en ${HOST}:${PORT}`);

server.on('connection', (ws) => {
  console.log('Cliente conectado');
  
  ws.on('message', (data) => {
    console.log(`Recibido buffer de ${data.length} bytes`);
    
    if (data.length < 104) {
      console.log('Payload demasiado corto');
      return;
    }
    
    const signature = data.slice(0, 64);
    const pubKey = data.slice(64, 96);
    const timestamp = Number(data.readBigInt64LE(96));
    const jsonStr = data.slice(104).toString('utf8');
    
    console.log('Timestamp:', new Date(timestamp).toISOString());
    console.log('JSON raw:', jsonStr);
    
    try {
      const payload = JSON.parse(jsonStr);
      console.log('✅ JSON válido:', payload);
      console.log('Threat type:', payload.threat_type);
    } catch(e) {
      console.log('⚠️ JSON inválido, aplicando regex fallback');
      const isThreat = /UNLIMITED_APPROVAL|DRAINER|THREAT_URGENT|CRYPTO_DRAINER/i.test(jsonStr);
      console.log('Regex threat detectado:', isThreat);
    }
    
    ws.send('ACK');
  });
  
  ws.on('close', () => console.log('Cliente desconectado'));
});

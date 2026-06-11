import { WebSocketServer } from 'ws';
const server = new WebSocketServer({ port: 8080, host: '0.0.0.0' });
console.log('PC servidor WebSocket escuchando en puerto 8080');
server.on('connection', (ws) => {
  console.log('Android conectado');
  ws.on('message', (data) => {
    console.log(`Mensaje recibido (${data.length} bytes):`, data);
    ws.send('ACK');
  });
});

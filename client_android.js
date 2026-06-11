const WebSocket = require('ws');
const ws = new WebSocket('ws://192.168.1.8:8080');
ws.on('open', () => {
  console.log('Conectado a PC');
  const buffer = Buffer.from('Hola desde Android', 'utf8');
  ws.send(buffer);
});
ws.on('message', (data) => console.log('Respuesta PC:', data.toString()));

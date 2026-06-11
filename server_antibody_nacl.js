const WebSocket = require('ws');
const nacl = require('tweetnacl');
const fs = require('fs');

const secretKey = fs.readFileSync('node_priv.key');
const publicKey = fs.readFileSync('node_pub.key'); // 32 bytes raw

const threat = {
  threat_type: "Unlimited Approval Drainer",
  confidence: 0.99,
  reasoning: "Detectado por inferencia local en PC"
};
const jsonPayload = JSON.stringify(threat);
const timestamp = Date.now();

// Datos a firmar: publicKey (32) + timestamp (8) + json
const dataToSign = Buffer.concat([
  publicKey,
  Buffer.alloc(8),
  Buffer.from(jsonPayload)
]);
dataToSign.writeBigInt64LE(BigInt(timestamp), publicKey.length);

const signature = nacl.sign.detached(dataToSign, secretKey);

// Buffer final: firma(64) + pubKey(32) + timestamp(8) + json
const buffer = Buffer.alloc(64 + 32 + 8 + jsonPayload.length);
signature.copy(buffer, 0);
publicKey.copy(buffer, 64);
buffer.writeBigInt64LE(BigInt(timestamp), 96);
buffer.write(jsonPayload, 104);

const server = new WebSocket.Server({ port: 8080, host: '0.0.0.0' });
console.log('Servidor antibiótico (nacl) escuchando en 8080');
server.on('connection', (ws) => {
  console.log('Android conectado, enviando anticuerpo...');
  ws.send(buffer);
  ws.on('message', (msg) => console.log('Recibido:', msg.toString()));
});

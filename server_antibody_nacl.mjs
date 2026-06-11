import { WebSocketServer } from 'ws';
import nacl from 'tweetnacl';
import fs from 'fs';

const secretKey = fs.readFileSync('node_priv.key');
const publicKey = fs.readFileSync('node_pub.key');

const threat = {
  threat_type: "Unlimited Approval Drainer",
  confidence: 0.99,
  reasoning: "Detectado por inferencia local en PC"
};
const jsonPayload = JSON.stringify(threat);
const timestamp = Date.now();

const dataToSign = Buffer.concat([
  publicKey,
  Buffer.alloc(8),
  Buffer.from(jsonPayload)
]);
dataToSign.writeBigInt64LE(BigInt(timestamp), publicKey.length);

const signature = nacl.sign.detached(dataToSign, secretKey);

const buffer = Buffer.alloc(64 + 32 + 8 + jsonPayload.length);
signature.copy(buffer, 0);
publicKey.copy(buffer, 64);
buffer.writeBigInt64LE(BigInt(timestamp), 96);
buffer.write(jsonPayload, 104);

const server = new WebSocketServer({ port: 8080, host: '0.0.0.0' });
console.log('Servidor antibiótico (nacl) escuchando en 8080');
server.on('connection', (ws) => {
  console.log('Android conectado, enviando anticuerpo...');
  ws.send(buffer);
  ws.on('message', (msg) => console.log('Recibido:', msg.toString()));
});

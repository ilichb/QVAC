import { WebSocket } from 'ws';
import crypto from 'crypto';

const TARGET_IP = '192.168.1.3';
const TARGET_PORT = 8080;

// Generar keypair Ed25519 demo
const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
const pubKeyDer = publicKey.export({ type: 'spki', format: 'der' });
const pubKeyBuffer = pubKeyDer.subarray(pubKeyDer.length - 32);

// Payload JSON correctamente formado
const threat = {
  threat_type: "Unlimited Approval Drainer",
  confidence: 0.96,
  reasoning: "Función approve con amount = 2**256-1 detectada"
};
const jsonPayload = JSON.stringify(threat);
const timestamp = Date.now();

// Construir data a firmar: pubKey (32) + timestamp (8) + json
const dataToSign = Buffer.concat([
  pubKeyBuffer,
  Buffer.alloc(8),
  Buffer.from(jsonPayload)
]);
dataToSign.writeBigInt64LE(BigInt(timestamp), pubKeyBuffer.length);

const signature = crypto.sign(null, dataToSign, privateKey);

// Buffer final: signature(64) + pubKey(32) + timestamp(8) + json
const totalLen = 64 + 32 + 8 + jsonPayload.length;
const buffer = Buffer.alloc(totalLen);
signature.copy(buffer, 0);
pubKeyBuffer.copy(buffer, 64);
buffer.writeBigInt64LE(BigInt(timestamp), 96);
buffer.write(jsonPayload, 104);

const ws = new WebSocket(`ws://${TARGET_IP}:${TARGET_PORT}`);
ws.on('open', () => {
  console.log('Enviando payload inmune...');
  ws.send(buffer);
});
ws.on('message', (msg) => console.log('Respuesta:', msg.toString()));
ws.on('error', console.error);
ws.on('close', () => console.log('Conexión cerrada'));

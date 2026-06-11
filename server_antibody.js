import { WebSocketServer } from 'ws';
import { generateKeyPairSync, sign } from 'crypto';
import fs from 'fs';

// Generar claves Ed25519 (solo si no existen)
let privPem, pubDer;
if (!fs.existsSync('node_priv.pem')) {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519', {
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'der' }
  });
  fs.writeFileSync('node_priv.pem', privateKey);
  fs.writeFileSync('node_pub.der', publicKey);
  privPem = privateKey;
  pubDer = publicKey;
} else {
  privPem = fs.readFileSync('node_priv.pem', 'utf8');
  pubDer = fs.readFileSync('node_pub.der');
}
const rawPubKey = pubDer.subarray(pubDer.length - 32); // 32 bytes raw

const threat = {
  threat_type: "Unlimited Approval Drainer",
  confidence: 0.99,
  reasoning: "Detectado por inferencia local en PC"
};
const jsonPayload = JSON.stringify(threat);
const timestamp = Date.now();

// Datos a firmar: rawPubKey (32) + timestamp (8) + json
const dataToSign = Buffer.concat([
  rawPubKey,
  Buffer.alloc(8),
  Buffer.from(jsonPayload)
]);
dataToSign.writeBigInt64LE(BigInt(timestamp), rawPubKey.length);

// Firma Ed25519
const signature = sign(null, dataToSign, privPem); // null = no digest

// Buffer final: firma(64) + pubKey(32) + timestamp(8) + json
const buffer = Buffer.alloc(64 + 32 + 8 + jsonPayload.length);
signature.copy(buffer, 0);
rawPubKey.copy(buffer, 64);
buffer.writeBigInt64LE(BigInt(timestamp), 96);
buffer.write(jsonPayload, 104);

const server = new WebSocketServer({ port: 8080, host: '0.0.0.0' });
console.log('Servidor antibiótico escuchando en 8080');
server.on('connection', (ws) => {
  console.log('Android conectado, enviando anticuerpo...');
  ws.send(buffer);
  ws.on('message', (msg) => console.log('Recibido:', msg.toString()));
});

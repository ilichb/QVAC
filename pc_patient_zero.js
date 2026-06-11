import { loadModel, completion, unloadModel } from '@qvac/sdk';
import { WebSocket } from 'ws';
import nacl from 'tweetnacl';
import fs from 'fs';

const MODEL_PATH = './models/qwen2.5-1.5b-instruct.gguf';
const ANDROID_IP = '192.168.1.3';
const WS_PORT = 8080;

async function detectThreat() {
  let modelId = null;
  try {
    console.log('Cargando modelo...');
    modelId = await loadModel({
      modelSrc: MODEL_PATH,
      modelType: 'llm',
      onProgress: p => console.log(`Progreso: ${Math.round(p.progress*100)}%`)
    });
    console.log('Modelo cargado, evaluando contrato...');

    const history = [
      { role: "system", content: `Eres un analista de seguridad de smart contracts. Responde ÚNICAMENTE con un JSON válido:
{
  "threat_type": "Unlimited Approval Drainer" o "Safe",
  "confidence": número entre 0 y 1,
  "reasoning": "breve explicación"
}` },
      { role: "user", content: "Contrato: function approve(address spender, uint256 amount) public { allowed[msg.sender][spender] = amount; } con amount = 2**256 - 1" }
    ];
    const result = completion({ modelId, history, stream: false });
    let response = await result.text;
    // Limpiar markdown
    response = response.replace(/```json\s*|\s*```/g, '');
    const match = response.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON');
    const threat = JSON.parse(match[0]);
    console.log('Inferencia:', threat);
    if (threat.threat_type === 'Unlimited Approval Drainer') {
      await generateAndSendAntibody(threat);
    } else {
      console.log('Contrato seguro, no se genera anticuerpo.');
    }
  } catch(e) {
    console.error('Error en inferencia:', e);
  } finally {
    if (modelId) await unloadModel({ modelId });
  }
}

async function generateAndSendAntibody(threat) {
  // Generar o cargar claves Ed25519
  let secretKey, publicKey;
  if (!fs.existsSync('node_priv.key')) {
    const keyPair = nacl.sign.keyPair();
    secretKey = keyPair.secretKey;
    publicKey = keyPair.publicKey;
    fs.writeFileSync('node_priv.key', Buffer.from(secretKey));
    fs.writeFileSync('node_pub.key', Buffer.from(publicKey));
    console.log('Nuevo par de claves generado.');
  } else {
    secretKey = fs.readFileSync('node_priv.key');
    publicKey = fs.readFileSync('node_pub.key');
  }

  const jsonPayload = JSON.stringify(threat);
  const timestamp = Date.now();

  const dataToSign = Buffer.concat([publicKey, Buffer.alloc(8), Buffer.from(jsonPayload)]);
  dataToSign.writeBigInt64LE(BigInt(timestamp), publicKey.length);
  const signature = nacl.sign.detached(dataToSign, secretKey);

  const buffer = Buffer.alloc(64 + 32 + 8 + jsonPayload.length);
  signature.copy(buffer, 0);
  publicKey.copy(buffer, 64);
  buffer.writeBigInt64LE(BigInt(timestamp), 96);
  buffer.write(jsonPayload, 104);

  console.log('Conectando a Android para enviar anticuerpo...');
  const ws = new WebSocket(`ws://${ANDROID_IP}:${WS_PORT}`);
  ws.on('open', () => {
    console.log('Enviando payload inmune...');
    ws.send(buffer);
  });
  ws.on('message', msg => console.log('Respuesta Android:', msg.toString()));
  ws.on('error', err => console.error('WebSocket error:', err.message));
  ws.on('close', () => console.log('Conexión cerrada'));
}

detectThreat().catch(console.error);

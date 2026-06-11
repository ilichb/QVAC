const fs = require('fs');

const qrText = process.argv[2] || "0x742d35Cc6634C0532925a3b844Bc9e7595f90b0a approve unlimited";
console.log("📲 Escaneado:", qrText);

let memory = [];
try {
  memory = JSON.parse(fs.readFileSync('immune_memory.json'));
} catch(e) {}

const isKnown = memory.some(entry =>
  entry.threat_type === 'Unlimited Approval Drainer' &&
  (qrText.includes('approve') || qrText.includes('unlimited'))
);

if (isKnown) {
  console.log('🛡️ Threat neutralized by collective immunity (Offline)');
  console.log('✅ Transacción bloqueada. Fondos a salvo.');
} else {
  console.log('⚠️ Nueva amenaza. Se requiere inferencia local...');
  console.log('🔍 Simulando análisis: drainer detectado.');
  console.log('📡 Generando anticuerpo y propagando a la malla...');
}

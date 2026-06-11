import { loadModel, completion, unloadModel } from '@qvac/sdk';
import { resolve } from 'path';

const modelPath = resolve('./models/qwen2.5-1.5b-instruct.gguf');

async function main() {
  let modelId = null;
  try {
    console.log('Cargando modelo local:', modelPath);
    modelId = await loadModel({
      modelSrc: modelPath,
      modelType: 'llm',
      onProgress: (p) => console.log(`Progreso: ${Math.round(p.progress * 100)}%`)
    });
    console.log('Modelo cargado, ID:', modelId);

    const history = [
      { role: "system", content: `Eres un analista de seguridad de smart contracts. Tu tarea es clasificar si un contrato es un "Unlimited Approval Drainer" (drenador de aprobación ilimitada) o no. Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown, sin explicaciones. El JSON debe tener exactamente estos campos:
{
  "threat_type": "Unlimited Approval Drainer" o "Safe",
  "confidence": número entre 0 y 1,
  "reasoning": "breve explicación"
}` },
      { role: "user", content: "Contrato: 0x123... función approve(address spender, uint256 amount) con amount = 2**256 - 1" }
    ];
    
    const result = completion({ modelId, history, stream: false });
    let response = await result.text;
    console.log('Respuesta cruda:', response);
    
    // Limpiar markdown
    let cleaned = response.replace(/```json\s*|\s*```/g, '');
    // Extraer JSON
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('JSON parseado:', parsed);
      } catch(e) {
        console.log('JSON inválido, aplicando regex fallback');
        const isThreat = /UNLIMITED_APPROVAL|DRAINER/i.test(response);
        console.log('Threat detectado por regex:', isThreat);
      }
    } else {
      console.log('No se encontró JSON, regex fallback');
      const isThreat = /UNLIMITED_APPROVAL|DRAINER/i.test(response);
      console.log('Threat detectado por regex:', isThreat);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (modelId) await unloadModel({ modelId });
  }
}
main();

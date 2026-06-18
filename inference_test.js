/**
 * inference_test.js — Local LLM inference test
 *
 * Verifies that the Qwen 2.5 1.5B Instruct model loads correctly
 * and can classify an Unlimited Approval Drainer.
 *
 * Usage: node inference_test.js
 */

import { loadModel, completion, unloadModel } from '@qvac/sdk';
import { resolve } from 'path';

const modelPath = resolve('./models/qwen2.5-1.5b-instruct.gguf');

async function main() {
  let modelId = null;
  try {
    console.log('Loading local model:', modelPath);
    modelId = await loadModel({
      modelSrc: modelPath,
      modelType: 'llm',
      onProgress: (p) => console.log(`Progress: ${Math.round(p.progress * 100)}%`)
    });
    console.log('Model loaded, ID:', modelId);

    const history = [
      {
        role: "system",
        content: `You are a Solana smart contract security analyst. Your task is to classify whether a contract is an "Unlimited Approval Drainer" or not. Respond ONLY with a valid JSON object, no extra text, no markdown, no explanations. The JSON must have exactly these fields:
{
  "threat_type": "Unlimited Approval Drainer" or "Safe",
  "confidence": number between 0 and 1,
  "reasoning": "brief explanation"
}`
      },
      {
        role: "user",
        content: "Contract: 0x123... function approve(address spender, uint256 amount) with amount = 2**256 - 1"
      }
    ];

    const result = completion({ modelId, history, stream: false });
    let response = await result.text;
    console.log('Raw response:', response);

    // Clean markdown code blocks
    let cleaned = response.replace(/```json\s*|\s*```/g, '');
    // Extract JSON
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('Parsed JSON:', parsed);
      } catch (e) {
        console.log('Invalid JSON, applying regex fallback');
        const isThreat = /UNLIMITED_APPROVAL|DRAINER/i.test(response);
        console.log('Threat detected by regex:', isThreat);
      }
    } else {
      console.log('No JSON found, regex fallback');
      const isThreat = /UNLIMITED_APPROVAL|DRAINER/i.test(response);
      console.log('Threat detected by regex:', isThreat);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (modelId) await unloadModel({ modelId });
  }
}
main();

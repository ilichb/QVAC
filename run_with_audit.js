/**
 * run_with_audit.js — Structured audit log for DIM Protocol demo runs
 *
 * Wraps pc_patient_zero.js execution and captures:
 * - Model load/unload timestamps
 * - Inference duration
 * - Full terminal output
 * - Exit code and total duration
 *
 * Usage:  node run_with_audit.js
 * Output: audit_log.json (appended on each run)
 */

import { spawn } from 'child_process';
import fs from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_FILE = resolve(__dirname, 'audit_log.json');
const MAX_ENTRIES = 50;

// ── Load existing audit log ─────────────────────────────────────────────────
let audit = [];
try {
    if (fs.existsSync(LOG_FILE)) {
        audit = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
        if (!Array.isArray(audit)) audit = [];
    }
} catch (e) {
    audit = [];
}

// ── Spawn Patient Zero ──────────────────────────────────────────────────────
const startTime = Date.now();
const proc = spawn('node', ['pc_patient_zero.js'], {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env }
});

let fullOutput = '';
let modelLoadTime = null;
let modelUnloadTime = null;
let inferenceStartTime = null;
let inferenceEndTime = null;
let inferenceDuration = null;

proc.stdout.on('data', (data) => {
    const text = data.toString();
    fullOutput += text;
    process.stdout.write(text);

    // Parse model load time
    if (text.includes('✅ Model loaded')) {
        modelLoadTime = Date.now();
    }

    // Parse inference start
    if (text.includes('Running local inference')) {
        inferenceStartTime = Date.now();
    }

    // Parse inference result
    if (text.includes('🔍 Inference:')) {
        inferenceEndTime = Date.now();
        if (inferenceStartTime) {
            inferenceDuration = inferenceEndTime - inferenceStartTime;
        }
    }

    // Parse model unload
    if (text.includes('unloaded')) {
        modelUnloadTime = Date.now();
    }
});

proc.stderr.on('data', (data) => {
    const text = data.toString();
    fullOutput += text;
    process.stderr.write(text);
});

proc.on('close', (code) => {
    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // ── Build structured entry ────────────────────────────────────────────────
    const entry = {
        run_id: audit.length + 1,
        timestamp: new Date().toISOString(),
        total_duration_ms: totalDuration,
        exit_code: code,
        model_load_ms: modelLoadTime ? modelLoadTime - startTime : null,
        model_unload_ms: modelUnloadTime ? modelUnloadTime - startTime : null,
        inference_duration_ms: inferenceDuration,
        log: fullOutput
    };

    audit.push(entry);

    // Trim to max entries (FIFO)
    if (audit.length > MAX_ENTRIES) {
        audit = audit.slice(audit.length - MAX_ENTRIES);
    }

    // ── Write atomically ──────────────────────────────────────────────────────
    const tmpFile = LOG_FILE + '.tmp';
    fs.writeFileSync(tmpFile, JSON.stringify(audit, null, 2));
    fs.renameSync(tmpFile, LOG_FILE);

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('\n' + '='.repeat(50));
    console.log('📊 AUDIT LOG SUMMARY');
    console.log('='.repeat(50));
    console.log(`   Run ID:           ${entry.run_id}`);
    console.log(`   Timestamp:        ${entry.timestamp}`);
    console.log(`   Total duration:   ${totalDuration} ms (${(totalDuration / 1000).toFixed(1)} s)`);
    console.log(`   Model load:       ${entry.model_load_ms !== null ? entry.model_load_ms + ' ms' : 'N/A'}`);
    console.log(`   Inference:        ${entry.inference_duration_ms !== null ? entry.inference_duration_ms + ' ms' : 'N/A'}`);
    console.log(`   Model unload:     ${entry.model_unload_ms !== null ? entry.model_unload_ms + ' ms' : 'N/A'}`);
    console.log(`   Exit code:        ${code}`);
    console.log(`   Log file:         ${LOG_FILE}`);
    console.log(`   Total runs:       ${audit.length}`);
    console.log('='.repeat(50));
});

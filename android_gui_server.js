/**
 * android_gui_server.js — Interfaz gráfica táctil para Android
 * 
 * Sirve una web app optimizada para móvil en el puerto 5000
 * que permite controlar el nodo DIM Protocol desde el navegador.
 * 
 * Uso: node android_gui_server.js
 * Luego abre http://localhost:5000 en tu navegador Android
 * o desde cualquier dispositivo en la red.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 5000;
const MEMORY_FILE = path.join(__dirname, 'immune_memory.json');

// Estado del servidor inmune
let immuneServer = null;
let immuneServerPort = null;
let immuneMemory = [];

function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      immuneMemory = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    }
  } catch (e) {
    immuneMemory = [];
  }
}

// HTML de la interfaz (cargado desde archivo separado)
const HTML_FILE = path.join(__dirname, 'public', 'android_gui.html');
let HTML = '';

try {
  HTML = fs.readFileSync(HTML_FILE, 'utf8');
} catch (e) {
  // Si no existe el archivo HTML, usar el inline
  HTML = getInlineHTML();
}

function getInlineHTML() {
  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"><title>DIM Protocol - Immune Node</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0a0a1a;color:#e0e0e0;min-height:100vh;padding:12px;padding-bottom:100px}.header{text-align:center;padding:16px 0;border-bottom:1px solid #1a1a3a;margin-bottom:16px}.header h1{font-size:20px;color:#00ffcc}.header p{font-size:12px;color:#666;margin-top:4px}.card{background:linear-gradient(135deg,#111133,#0a0a1a);border:1px solid #1a1a3a;border-radius:16px;padding:16px;margin-bottom:12px}.card-title{font-size:14px;color:#888;margin-bottom:8px}.card-value{font-size:24px;font-weight:bold;color:#00ffcc}.btn{display:block;width:100%;padding:16px;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;margin-bottom:8px;text-align:center}.btn:active{transform:scale(0.97)}.btn-primary{background:#00ffcc;color:#000}.btn-danger{background:#ff4444;color:#fff}.btn-secondary{background:#1a1a3a;color:#00ffcc;border:1px solid #00ffcc}.btn-success{background:#00cc88;color:#fff}.btn:disabled{opacity:0.5}.status-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:8px}.status-dot.online{background:#00ffcc;box-shadow:0 0 10px #00ffcc}.status-dot.offline{background:#ff4444;box-shadow:0 0 10px #ff4444}.status-dot.searching{background:#ffaa00;animation:pulse 0.5s infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}.log{background:#050510;border-radius:8px;padding:12px;font-family:monospace;font-size:11px;max-height:200px;overflow-y:auto;color:#888}.log .success{color:#00ffcc}.log .error{color:#ff4444}.log .warn{color:#ffaa00}.memory-item{background:#0a0a20;border:1px solid #1a1a3a;border-radius:8px;padding:10px;margin-bottom:8px;font-size:12px}.memory-item .threat{color:#ff4444;font-weight:bold}.memory-item .confidence{color:#00ffcc}.memory-item .time{color:#666;font-size:10px}.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:8px}.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#00ffcc;color:#000;padding:12px 24px;border-radius:24px;font-weight:600;z-index:1000;display:none}.toast.error{background:#ff4444;color:#fff}.toast.show{display:block}.ip-display{background:#050510;border-radius:8px;padding:8px 12px;font-family:monospace;font-size:14px;color:#00ffcc;text-align:center;margin:8px 0}.tab-bar{position:fixed;bottom:0;left:0;right:0;background:#0a0a1a;border-top:1px solid #1a1a3a;display:flex;padding:8px;padding-bottom:20px;z-index:100}.tab{flex:1;text-align:center;padding:8px;border-radius:8px;font-size:11px;color:#666;cursor:pointer}.tab.active{color:#00ffcc;background:#111133}.tab .icon{font-size:20px;display:block}.page{display:none}.page.active{display:block}.badge{display:inline-block;background:#00ffcc;color:#000;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:bold}</style></head><body><div class="header"><h1>DIM Protocol</h1><p>Digital Immune Mesh &mdash; Immune Node</p></div><div id="toast" class="toast"></div><div id="page-dashboard" class="page active"><div class="card"><div class="card-title"><span class="status-dot offline" id="statusDot"></span><span id="statusText">Servidor detenido</span></div><div class="ip-display" id="ipDisplay">IP: detectando...</div></div><div class="grid-2"><div class="card"><div class="card-title">Anticuerpos</div><div class="card-value" id="antibodyCount">0</div></div><div class="card"><div class="card-title">Puerto</div><div class="card-value" id="portDisplay">--</div></div></div><button class="btn btn-primary" id="btnStart">Iniciar servidor inmune</button><button class="btn btn-danger" id="btnStop" style="display:none">Detener servidor</button><div class="card"><div class="card-title">Ultimos eventos</div><div class="log" id="eventLog">Esperando eventos...</div></div></div><div id="page-memory" class="page"><div class="card"><div class="card-title">Memoria Inmune <span class="badge" id="memoryBadge">0</span></div><div id="memoryList"><p style="color:#666;text-align:center;padding:20px;">No hay anticuerpos aun</p></div></div><button class="btn btn-secondary" id="btnRefreshMemory">Refrescar</button></div><div id="page-scanner" class="page"><div class="card"><div class="card-title">Escanear amenaza</div><p style="color:#888;font-size:13px;margin-bottom:12px;">Pega el texto del QR o la direccion del contrato malicioso para verificar si esta bloqueado.</p><input type="text" id="qrInput" placeholder="0x742d... approve unlimited" style="width:100%;padding:12px;background:#050510;border:1px solid #1a1a3a;border-radius:8px;color:#fff;font-size:14px;margin-bottom:8px;"><button class="btn btn-success" id="btnScan">Verificar amenaza</button><div id="scanResult" style="margin-top:12px;display:none;"></div></div></div><div id="page-info" class="page"><div class="card"><div class="card-title">Acerca de</div><p style="font-size:13px;color:#888;line-height:1.6;"><b style="color:#00ffcc;">DIM Protocol</b> es un sistema de seguridad descentralizado que protege wallets de Solana contra <b style="color:#ff4444;">Unlimited Approval Drainers</b>.</p><br><p style="font-size:13px;color:#888;line-height:1.6;"> PC &mdash; Detecta amenazas con IA local<br> Android &mdash; Almacena y bloquea<br> Ed25519 &mdash; Firmas criptograficas<br> P2P Mesh &mdash; Sin internet necesario</p></div></div><div class="tab-bar"><div class="tab active" data-page="dashboard"><span class="icon">&#x1F3E0;</span>Dashboard</div><div class="tab" data-page="memory"><span class="icon">&#x1F9E0;</span>Memoria</div><div class="tab" data-page="scanner"><span class="icon">&#x1F4F7;</span>Scanner</div><div class="tab" data-page="info"><span class="icon">&#x2139;</span>Info</div></div><script>const $=id=>document.getElementById(id);const toast=$("toast");function showToast(msg,type){toast.textContent=msg;toast.className="toast show "+(type||"");setTimeout(()=>toast.className="toast",2500)}document.querySelectorAll(".tab").forEach(tab=>{tab.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));tab.classList.add("active");$("page-"+tab.dataset.page).classList.add("active")})});async function getLocalIP(){try{const r=await fetch("/api/ip");const d=await r.json();$("ipDisplay").textContent="IP: "+d.ip}catch(e){$("ipDisplay").textContent="IP: no disponible"}}async function getStatus(){try{const r=await fetch("/api/status");const d=await r.json();updateUI(d)}catch(e){}}function updateUI(d){const dot=$("statusDot");const txt=$("statusText");if(d.serverRunning){dot.className="status-dot online";txt.textContent="Servidor activo";$("portDisplay").textContent=d.port||"8080";$("btnStart").style.display="none";$("btnStop").style.display="block"}else{dot.className="status-dot offline";txt.textContent="Servidor detenido";$("portDisplay").textContent="--";$("btnStart").style.display="block";$("btnStop").style.display="none"}$("antibodyCount").textContent=d.antibodyCount||0;$("memoryBadge").textContent=d.antibodyCount||0}async function startServer(){$("btnStart").disabled=true;$("btnStart").textContent="Iniciando...";$("statusDot").className="status-dot searching";$("statusText").textContent="Iniciando servidor...";try{const r=await fetch("/api/start",{method:"POST"});const d=await r.json();if(d.success){showToast("Servidor iniciado en puerto "+d.port);addLog("success","Servidor inmune iniciado en puerto "+d.port);await getStatus()}else{showToast("Error: "+d.error,"error");addLog("error","Error al iniciar: "+d.error)}}catch(e){showToast("Error de conexion","error")}$("btnStart").disabled=false;$("btnStart").textContent="Iniciar servidor inmune"}async function stopServer(){try{const r=await fetch("/api/stop",{method:"POST"});const d=await r.json();if(d.success){showToast("Servidor detenido");addLog("warn","Servidor inmune detenido");await getStatus()}}catch(e){showToast("Error de conexion","error")}}async function loadMemory(){try{const r=await fetch("/api/memory");const d=await r.json();const list=$("memoryList");if(d.memory&&d.memory.length>0){list.innerHTML=d.memory.map(m=>"<div class=\"memory-item\"><div class=\"threat\">"+m.threat_type+"</div><div class=\"confidence\">Confianza: "+(m.confidence||0)+"</div><div class=\"time\">"+new Date(m.timestamp||Date.now()).toLocaleString()+"</div>"+(m.reasoning?"<div style=\"color:#888;font-size:11px;margin-top:4px;\">"+m.reasoning+"</div>":"")+"</div>").join("")}else{list.innerHTML="<p style=\"color:#666;text-align:center;padding:20px;\">No hay anticuerpos aun</p>"}$("memoryBadge").textContent=d.memory?d.memory.length:0}catch(e){}}async function checkThreat(){const text=$("qrInput").value.trim();if(!text){showToast("Escribe un texto para verificar","error");return}const rd=$("scanResult");rd.style.display="block";rd.innerHTML="<p style=\"color:#ffaa00;\">Verificando...</p>";try{const r=await fetch("/api/check-threat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text})});const d=await r.json();if(d.blocked){rd.innerHTML="<div style=\"background:#003322;border:1px solid #00ffcc;border-radius:12px;padding:20px;text-align:center;\"><div style=\"font-size:40px;margin-bottom:8px;\">THREAT NEUTRALIZED</div><div style=\"color:#00ffcc;font-size:18px;font-weight:bold;\">Bloqueado por inmunidad colectiva</div></div>";showToast("Amenaza bloqueada!");addLog("success","Amenaza bloqueada: "+text.substring(0,40)+"...")}else{rd.innerHTML="<div style=\"background:#221100;border:1px solid #ffaa00;border-radius:12px;padding:20px;text-align:center;\"><div style=\"font-size:40px;margin-bottom:8px;\">NO RECONOCIDA</div><div style=\"color:#ffaa00;font-size:18px;font-weight:bold;\">No hay anticuerpos para esta amenaza</div></div>";showToast("Amenaza no reconocida","error");addLog("warn","Amenaza desconocida: "+text.substring(0,40)+"...")}}catch(e){rd.innerHTML="<p style=\"color:#ff4444;\">Error al verificar</p>"}}function addLog(type,msg){const log=$("eventLog");const t=new Date().toLocaleTimeString();if(log.textContent==="Esperando eventos...")log.innerHTML="";log.innerHTML="<span class=\""+type+"\">["+t+"] "+msg+"</span>\n"+log.innerHTML}$("btnStart").addEventListener("click",startServer);$("btnStop").addEventListener("click",stopServer);$("btnRefreshMemory").addEventListener("click",loadMemory);$("btnScan").addEventListener("click",checkThreat);$("qrInput").addEventListener("keypress",e=>{if(e.key==="Enter")checkThreat()});setInterval(()=>{getStatus();if(document.getElementById("page-memory").classList.contains("active"))loadMemory()},5000);getLocalIP();getStatus();loadMemory();addLog("info","Interfaz DIM Protocol iniciada");</script></body></html>';
}

// ============ SERVIDOR HTTP ============

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost:' + PORT);
  const path = url.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (path === '/api/ip') {
    try {
      const ip = execSync("ip -4 addr show | grep -oP '(?<=inet\\s)\\d+(\\.\\d+){3}' | grep -v 127.0.0.1 | head -1").toString().trim();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ip: ip || 'unknown' }));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ip: 'unknown' }));
    }
    return;
  }

  if (path === '/api/status') {
    loadMemory();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      serverRunning: immuneServer !== null,
      port: immuneServerPort,
      antibodyCount: immuneMemory.length
    }));
    return;
  }

  if (path === '/api/start' && req.method === 'POST') {
    if (immuneServer) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, port: immuneServerPort }));
      return;
    }

    const child = spawn('node', ['android_immune_server.js'], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let started = false;
    let port = 8080;

    child.stdout.on('data', (data) => {
      const text = data.toString();
      console.log('[immune]', text.trim());
      const portMatch = text.match(/listening on.*?(\d+)/i) || text.match(/port[^0-9]*(\d+)/i);
      if (portMatch && !started) {
        port = parseInt(portMatch[1]);
        started = true;
        immuneServerPort = port;
        immuneServer = child;
      }
    });

    child.stderr.on('data', (data) => {
      console.log('[immune:err]', data.toString().trim());
    });

    child.on('error', (err) => {
      console.error('Failed to start immune server:', err);
      immuneServer = null;
    });

    child.on('exit', (code) => {
      console.log('Immune server exited with code', code);
      immuneServer = null;
      immuneServerPort = null;
    });

    // Esperar 3s para que arranque
    setTimeout(() => {
      if (started || immuneServer) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, port: port }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Timeout starting server' }));
      }
    }, 3000);
    return;
  }

  if (path === '/api/stop' && req.method === 'POST') {
    if (immuneServer) {
      immuneServer.kill('SIGTERM');
      immuneServer = null;
      immuneServerPort = null;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  if (path === '/api/memory') {
    loadMemory();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ memory: immuneMemory }));
    return;
  }

  if (path === '/api/check-threat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const text = data.text || '';
        loadMemory();
        const isKnown = immuneMemory.some(function (entry) {
          return entry.threat_type === 'Unlimited Approval Drainer' &&
            (text.toLowerCase().includes('approve') || text.toLowerCase().includes('unlimited'));
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ blocked: isKnown }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  // Servir HTML
  if (path === '/' || path === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', function () {
  console.log('');
  console.log('============================================');
  console.log('   DIM Protocol - Android GUI');
  console.log('');
  console.log('   Abre en tu Android:');
  console.log('   http://localhost:' + PORT);
  console.log('');
  console.log('   O desde cualquier dispositivo:');
  console.log('   http://<IP_ANDROID>:' + PORT);
  console.log('');
  console.log('   Toca "Iniciar servidor inmune"');
  console.log('   para activar el nodo');
  console.log('============================================');
  console.log('');
});

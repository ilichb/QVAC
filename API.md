# DIM Protocol — API Reference

> **Protocol version:** 0.2.0  
> **Last updated:** June 2026

---

## 1. UDP Discovery (Node Discovery)

**Port:** `47808` (UDP broadcast)

**Message format (string):**
```
DIM_NODE:<port>
```

**Example:**
```
DIM_NODE:8080
```

**Behavior:**
- Sent every **4 seconds** by each active node
- Receiving nodes parse the port and connect via WebSocket to `<sender_ip>:<port>`
- Timeout: **10 seconds** (if no node found, falls back to manual IP)

**Implementation:** `discovery.js`

---

## 2. WebSocket Payload (Antibody Transfer)

**Protocol:** WebSocket (binary)

**Payload structure:**
```
┌──────────────────────────────────────────────────────────────┐
│  Signature (64 bytes) │ PubKey (32 bytes) │ Timestamp (8) │ JSON Payload │
└──────────────────────────────────────────────────────────────┘
```

**Total minimum:** 104 bytes (64 + 32 + 8) + JSON variable

**JSON body example:**
```json
{
  "threat_type": "Unlimited Approval Drainer",
  "confidence": 0.99,
  "reasoning": "approve function with amount = 2**256-1 detected"
}
```

**Response (text):**
| Response | Meaning |
|----------|---------|
| `ACK` | Antibody accepted and stored |
| `INVALID_SIG` | Signature verification failed |
| `ERROR: payload too short` | Malformed payload (< 104 bytes) |

**Implementation:** `pc_patient_zero.js` (sender), `android_immune_server.js` (receiver)

---

## 3. HTTP Endpoints (Android Immune Node)

**Base URL:** `http://<android_ip>:<port>` (default port: 8080, auto-retry up to 8089)

### `GET /status`

Returns the current status of the immune node.

**Response:**
```json
{
  "connected": true,
  "ip": "192.168.1.14",
  "count": 3,
  "memory": [
    {
      "threat_type": "Unlimited Approval Drainer",
      "confidence": 0.99,
      "reasoning": "approve function with amount = 2**256-1 detected",
      "timestamp": 1718200000000,
      "signature": "hex...",
      "publicKey": "hex..."
    }
  ]
}
```

### `POST /test-threat`

Checks if a threat is known in the local immune memory.

**Request body:**
```json
{
  "threatText": "0x742d35Cc6634C0532925a3b844Bc9e7595f90b0a approve unlimited"
}
```

**Response (blocked):**
```json
{
  "blocked": true,
  "reason": "Collective immunity"
}
```

**Response (unknown):**
```json
{
  "blocked": false,
  "message": "Unknown threat"
}
```

### `OPTIONS *`

CORS preflight handler. Returns `Access-Control-Allow-Origin: *`.

**Implementation:** `android_immune_server.js`

---

## 4. PC Dashboard HTTP Endpoints (gui_pc.js)

**Base URL:** `http://localhost:3000`

### `POST /detect`

Triggers `pc_patient_zero.js` as a subprocess. Captures all stdout/stderr output.

**Response:**
```json
{
  "success": true,
  "output": "[log output of the detection script]"
}
```

**Timeout:** 120 seconds (model loading + inference + propagation)

### `GET /android/status`

Proxies to the Android node's `/status` endpoint. Uses cached discovery (TTL: 30s).

**Response:** Same as `GET /status` on the Android node.

### `POST /android/test-threat`

Proxies to the Android node's `/test-threat` endpoint.

**Request/Response:** Same as `POST /test-threat` on the Android node.

### `GET /` (Static Files)

Serves the web dashboard from `public/index.html`.

**Implementation:** `gui_pc.js`, `public/index.html`

---

## 5. Android GUI HTTP Endpoints (android_gui_server.js)

**Base URL:** `http://<android_ip>:5000`

### `GET /`

Serves the touch-friendly Android dashboard (HTML).

### `GET /api/status`

Returns the immune server status.

**Response:**
```json
{
  "serverRunning": true,
  "port": 8080,
  "antibodyCount": 3
}
```

### `POST /api/start`

Starts the immune server (spawns `android_immune_server.js`).

**Response:**
```json
{
  "success": true,
  "port": 8080
}
```

### `POST /api/stop`

Stops the immune server.

**Response:**
```json
{
  "success": true
}
```

### `GET /api/memory`

Returns the full immune memory.

**Response:**
```json
{
  "memory": [
    {
      "threat_type": "Unlimited Approval Drainer",
      "confidence": 0.99,
      "reasoning": "...",
      "timestamp": 1718200000000
    }
  ]
}
```

### `POST /api/check-threat`

Checks if a threat is known in local immune memory.

**Request body:**
```json
{
  "text": "0x742d35... approve unlimited"
}
```

**Response:**
```json
{
  "blocked": true
}
```

### `GET /api/ip`

Returns the device's local IP address.

**Response:**
```json
{
  "ip": "192.168.1.14"
}
```

**Implementation:** `android_gui_server.js`

---

## 6. Error Codes

| Code | Description |
|------|-------------|
| `INVALID_SIG` | Ed25519 signature verification failed |
| `ERROR: payload too short` | WebSocket payload < 104 bytes |
| `ERROR: invalid JSON` | Antibody JSON payload is malformed |
| `ERROR: no threat text` | `/test-threat` request body is empty |
| `ERROR: discovery timeout` | No Android node found via UDP within 10s |
| `ERROR: connection timeout` | WebSocket connection to Android timed out (15s) |

---

## 7. Data Formats

### Ed25519 Key Format
- **Private key:** 64 bytes (32-byte seed + 32-byte public key)
- **Public key:** 32 bytes
- **Signature:** 64 bytes
- **Storage:** Raw binary files (`node_priv.key`, `node_pub.key`)

### Timestamp Format
- **Encoding:** 64-bit little-endian signed integer
- **Unit:** Milliseconds since Unix epoch (1970-01-01)
- **Size:** 8 bytes

### Immune Memory File (`immune_memory.json`)
```json
[
  {
    "threat_type": "Unlimited Approval Drainer",
    "confidence": 0.99,
    "reasoning": "approve function with amount = 2**256-1 detected",
    "timestamp": 1718200000000,
    "signature": "hex-encoded 64 bytes",
    "publicKey": "hex-encoded 32 bytes"
  }
]
```

**Limits:**
- Maximum entries: **100** (FIFO rotation)
- Atomic writes: written to `.tmp` file first, then renamed

---

## 8. Port Summary

| Port | Protocol | Service | Device |
|------|----------|---------|--------|
| 47808 | UDP | Node discovery (broadcast) | All |
| 8080-8089 | TCP (HTTP + WS) | Immune server | Android |
| 5000 | TCP (HTTP) | Android GUI dashboard | Android |
| 3000 | TCP (HTTP) | PC web dashboard | PC |

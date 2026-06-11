const nacl = require('tweetnacl');
const fs = require('fs');
const keyPair = nacl.sign.keyPair();
fs.writeFileSync('node_priv.key', Buffer.from(keyPair.secretKey));
fs.writeFileSync('node_pub.key', Buffer.from(keyPair.publicKey));
console.log('Claves generadas: node_priv.key (64 bytes), node_pub.key (32 bytes)');

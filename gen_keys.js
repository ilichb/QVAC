import { generateKeyPairSync } from 'crypto';
import fs from 'fs';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
fs.writeFileSync('node_priv.der', privateKey.export({ type: 'pkcs8', format: 'der' }));
fs.writeFileSync('node_pub.der', publicKey.export({ type: 'spki', format: 'der' }));
console.log('Claves generadas: node_priv.der, node_pub.der');

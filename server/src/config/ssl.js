import selfsigned from 'selfsigned';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function getOrCreateCertificate() {
  const certDir = path.resolve(__dirname, '../../.cert');
  const keyPath = path.join(certDir, 'key.pem');
  const certPath = path.join(certDir, 'cert.pem');

  if (fsSync.existsSync(keyPath) && fsSync.existsSync(certPath)) {
    return {
      key: await fs.readFile(keyPath),
      cert: await fs.readFile(certPath)
    };
  }

  await fs.mkdir(certDir, { recursive: true });

  console.log('[SSL Helper] Generating local self-signed SSL certificate for HTTPS...');
  const attrs = [
    { name: 'commonName', value: '10.159.238.198' },
    { name: 'countryName', value: 'IN' },
    { name: 'organizationName', value: 'Retail Billing Software' }
  ];

  const pems = await selfsigned.generate(attrs, {
    days: 365,
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 7, ip: '127.0.0.1' },
          { type: 7, ip: '10.159.238.198' }
        ]
      }
    ]
  });

  await fs.writeFile(keyPath, pems.private);
  await fs.writeFile(certPath, pems.cert);

  return {
    key: pems.private,
    cert: pems.cert
  };
}

// backend/src/utils/httpClient.js
const http = require('http');
const https = require('https');

function postJson(url, data, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const isHttps = u.protocol === 'https:';
      const payload = Buffer.from(JSON.stringify(data), 'utf-8');

      const options = {
        hostname: u.hostname,
        port: u.port || (isHttps ? 443 : 80),
        path: u.pathname + (u.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': payload.length,
          ...customHeaders, // ← aquí se agregan los headers extras
        },
      };

      const req = (isHttps ? https : http).request(options, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(body || '{}');
            if (res.statusCode >= 200 && res.statusCode < 300) resolve(json);
            else reject(Object.assign(new Error(json.message || `HTTP ${res.statusCode}`), { status: res.statusCode, body: json }));
          } catch {
            if (res.statusCode >= 200 && res.statusCode < 300) resolve({});
            else reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = { postJson };
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('===================================================================');
console.log('QUBENIX AI — SECURITY & CODE HYGIENE AUDIT');
console.log('===================================================================');

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`PASS: ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const gitignore = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf-8');
check('.gitignore excludes .env files', gitignore.includes('.env'));
check('.gitignore excludes .vercel directory', gitignore.includes('.vercel'));

function scanDirForSecrets(dir) {
  let leaks = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      leaks = leaks.concat(scanDirForSecrets(full));
    } else if (/\.(js|jsx|ts|tsx|html|css)$/.test(entry.name)) {
      const content = fs.readFileSync(full, 'utf-8');
      if (/sk-or-v1-[a-f0-9]{20,}/i.test(content) || /postgresql:\/\/[^@\s]+@/i.test(content)) {
        leaks.push(full);
      }
    }
  }
  return leaks;
}
const secretLeaks = scanDirForSecrets(path.join(rootDir, 'src'));
check('Zero hardcoded API keys or DB credentials in client src/', secretLeaks.length === 0);

// Verify Aurora/Weather reference and jargon are completely removed from client src/
const appCode = fs.readFileSync(path.join(rootDir, 'src/App.jsx'), 'utf-8');
const assistantCode = fs.readFileSync(path.join(rootDir, 'src/components/AssistantPanel.jsx'), 'utf-8');
const safetyCode = fs.readFileSync(path.join(rootDir, 'src/components/SafetyPanel.jsx'), 'utf-8');
const allUiCode = appCode + assistantCode + safetyCode;
check('Aurora/Weather removed from UI', !/AuroraWeatherStage|storm-background|Central Jakarta|Strom/i.test(allUiCode));
check('Technical jargon removed from UI', !/\b(PBKDF2|HMAC|OWASP|BM25|SQLi|XSS|RBAC|RAG)\b/i.test(allUiCode));

const vercelConfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'vercel.json'), 'utf-8'));
const headerKeys = (vercelConfig.headers?.[0]?.headers || []).map((h) => h.key);
check('HTTP Security Headers configured in vercel.json', headerKeys.includes('X-Frame-Options') && headerKeys.includes('Strict-Transport-Security'));

const apiCode = fs.readFileSync(path.join(rootDir, 'api/index.js'), 'utf-8');
const envExample = fs.readFileSync(path.join(rootDir, '.env.example'), 'utf-8');
check(
  'No hardcoded credentials or fallback secrets in repo',
  apiCode.includes("process.env.ADMIN_EMAIL || ''") &&
    apiCode.includes("process.env.ADMIN_PASSWORD || ''") &&
    !apiCode.includes('rawPassword ===') &&
    envExample.includes('ADMIN_PASSWORD=your_strong_admin_password_here')
);
check('Zero console.log statements in client src/', !/\bconsole\.log\b/.test(allUiCode));
check('Password hashing with PBKDF2-SHA512 (100k iterations)', apiCode.includes('pbkdf2Sync') && apiCode.includes('100000'));
check('Timing-safe comparison enabled', apiCode.includes('timingSafeEqual'));
check('Parameterized SQL queries ($1, $2)', apiCode.includes('$1') && apiCode.includes('params'));
check('Input & Assistant protections enabled', apiCode.includes('SQLI_PATTERNS') && apiCode.includes('checkAssistantInput'));
check('Admin-only safety route enforced', apiCode.includes("app.post('/api/security/pentest', requireAdmin"));

console.log('-------------------------------------------------------------------');
console.log(`Summary: ${passed} Passed, ${failed} Failed`);
if (failed > 0) process.exit(1);

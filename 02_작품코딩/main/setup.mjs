// 수궁야행 방 B · Cloudflare 자동 설정·배포 스크립트
// 사용법: 이 폴더에서  node setup.mjs        (처음 설정 + 배포, 여러 번 실행해도 안전)
//                     node setup.mjs --deploy   (수정한 뒤 배포만)
import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import readline from 'node:readline/promises';

const isWin = process.platform === 'win32';
const LOCAL = join('node_modules', '.bin', isWin ? 'wrangler.cmd' : 'wrangler');
let W = `"${LOCAL}"`;
const say = m => console.log(`\n▶ ${m}`);
// 출력을 받아 두면서 화면에도 그대로 보여 줍니다 (멈춘 것처럼 보이지 않게)
const run = (cmd, opt = {}) => {
  const r = spawnSync(cmd, { shell: true, encoding: 'utf8', input: opt.input, stdio: [opt.input ? 'pipe' : 'inherit', 'pipe', 'pipe'], timeout: opt.timeout || 180000 });
  const out = (r.stdout || '') + (r.stderr || '');
  if (!opt.quiet) process.stdout.write(out);
  if (r.error && r.error.code === 'ETIMEDOUT') { const e = new Error('시간 초과'); e.stdout = out; throw e; }
  if (r.status !== 0) { const e = new Error('실패'); e.stdout = out; throw e; }
  return out;
};
const live = cmd => spawnSync(cmd, { stdio: 'inherit', shell: true });
const ask = async q => { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); const a = await rl.question(q); rl.close(); return a.trim(); };

if (parseInt(process.versions.node, 10) < 18) { console.error('Node.js 18 이상이 필요해요. https://nodejs.org 에서 LTS 버전을 설치해 주세요.'); process.exit(1); }

// 0. wrangler 설치 (처음 한 번, 1~3분) — 진행 상황이 화면에 보입니다
if (!existsSync(LOCAL)) {
  say('Cloudflare 도구(wrangler) 설치 중… 처음 한 번만, 1~3분 걸려요');
  const r = spawnSync('npm install --no-save --no-audit --no-fund wrangler@4', { shell: true, stdio: 'inherit' });
  if (r.status !== 0 || !existsSync(LOCAL)) { console.error('설치에 실패했어요. 인터넷 연결을 확인하고 다시 실행해 주세요.'); process.exit(1); }
}

let toml = readFileSync('wrangler.toml', 'utf8');
let name = (toml.match(/^name\s*=\s*"([^"]+)"/m) || [])[1] || 'sugung-roomb';
const deployOnly = process.argv.includes('--deploy');

// 1. 로그인
say('Cloudflare 로그인 확인');
let who = '';
try { who = run(`${W} whoami`, { timeout: 60000 }); } catch (e) { who = String(e.stdout || ''); }
if (!/You are logged in|associated with the email/i.test(who)) {
  console.log('브라우저가 열리면 Cloudflare에 로그인하고 "Allow"를 눌러 주세요.\n(브라우저가 안 열리면 아래에 나오는 https://dash.cloudflare.com/oauth2/... 주소를 복사해 이 컴퓨터의 브라우저에 붙여 넣으세요)');
  if (live(`${W} login`).status !== 0) { console.error('로그인에 실패했어요. 다시 실행해 주세요.'); process.exit(1); }
} else console.log('로그인되어 있어요.');

if (!deployOnly) {
  // 2. 프로젝트 이름
  const n = await ask(`프로젝트 이름 (주소가 https://이름.pages.dev 가 됩니다) [${name}]: `);
  if (n) { if (!/^[a-z0-9-]{1,58}$/.test(n)) { console.error('영문 소문자, 숫자, - 만 쓸 수 있어요.'); process.exit(1); } name = n; }
  toml = toml.replace(/^name\s*=\s*"[^"]*"/m, `name = "${name}"`);
  writeFileSync('wrangler.toml', toml);

  // 3. KV 저장소
  if (toml.includes('여기에_KV_ID')) {
    say('데이터 저장소(KV) 만들기');
    let out = '';
    try { out = run(`${W} kv namespace create ROOMB`); }
    catch (e) { out = String(e.stdout || '') + String(e.stderr || ''); }
    let id = (out.match(/"?\bid"?\s*[=:]\s*"?([0-9a-f]{32})/i) || [])[1];
    if (!id) {   // 이미 있으면 목록에서 찾기
      try {
        const list = JSON.parse(run(`${W} kv namespace list`, { quiet: true }));
        const hit = list.find(ns => /ROOMB/.test(ns.title));
        id = hit && hit.id;
      } catch (e) {}
    }
    if (!id) { console.error('KV id를 찾지 못했어요. 아래 출력을 확인해 주세요:\n' + out); process.exit(1); }
    toml = toml.replace('여기에_KV_ID', id);
    writeFileSync('wrangler.toml', toml);
    console.log(`KV 준비 완료 (${id})`);
  } else console.log('\nKV는 이미 설정되어 있어요.');

  // 4. Pages 프로젝트
  say(`Pages 프로젝트 "${name}" 만들기`);
  try { run(`${W} pages project create ${name} --production-branch main`); console.log('만들었어요.'); }
  catch (e) { const t = String(e.stdout || '') + String(e.stderr || ''); console.log(/already exists|8000002/i.test(t) ? '이미 있어요.' : t); }

  // 5. 직원 PIN
  const pin = await ask('직원 PIN (숫자 4자리 이상, 그대로 두려면 Enter): ');
  if (pin) {
    if (!/^\d{4,12}$/.test(pin)) { console.error('PIN은 숫자 4~12자리로 해 주세요.'); process.exit(1); }
    say('직원 PIN 저장');
    try { run(`${W} pages secret put STAFF_PIN --project-name ${name}`, { input: pin + '\n' }); console.log('저장했어요.'); }
    catch (e) { console.error('PIN 저장 실패:\n' + (e.stdout || '') + (e.stderr || '')); process.exit(1); }
  }
}

// 6. 배포
say('배포 중… (1~2분)');
const r = spawnSync(`${W} pages deploy . --project-name ${name} --branch main --commit-dirty=true`, { shell: true, encoding: 'utf8' });
process.stdout.write(r.stdout || ''); process.stderr.write(r.stderr || '');
if (r.status !== 0) { console.error('\n배포에 실패했어요. 위 메시지를 캡처해 알려 주세요.'); process.exit(1); }
console.log(`\n완료! 주소: https://${name}.pages.dev  (직원용: /staff.html, 태블릿: /?kiosk=1)`);
console.log('수정한 뒤에는  node setup.mjs --deploy  만 실행하면 됩니다.');

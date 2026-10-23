// 시연용 사이트(demo) 만들기
// main 폴더(본 사이트)를 고친 뒤 이 파일을 실행하면, 같은 내용으로 시연용 사이트 폴더(demo)를 새로 만듭니다.
// 사용법: 이 폴더(sugung-roomB)에서   node make-demo.mjs
//
// 시연용 사이트가 본 사이트와 다른 점은 딱 세 가지입니다.
//  1. 참여 번호 없이 열어도 시험용 항목(0417)으로 바로 시작   (demo/app.html)
//  2. 빔 화면이 서버 없이 몇 초마다 시험용 초롱을 띄움        (demo/display.html)
//  3. PC에서 열면 휴대폰 모양 틀 안에 체험 화면을 띄움        (demo/index.html ← demo-wrapper/index.html)
import { cpSync, rmSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const MAIN = 'main', OUT = 'demo';
if (!existsSync(join(MAIN, 'index.html'))) { console.error('main/index.html 이 없어요. sugung-roomB 폴더에서 실행해 주세요.'); process.exit(1); }

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
// 서버·직원 화면·배포 설정은 시연용에 필요 없음
const SKIP = new Set(['functions', '_worker.js', '_routes.json', 'staff.html', 'setup.mjs', 'wrangler.toml', 'README.md', 'index.html', 'display.html', 'node_modules', '.wrangler']);
cpSync(MAIN, OUT, { recursive: true, filter: src => !SKIP.has(src.split(/[\\/]/).slice(1)[0] ?? '') || src === MAIN });

const swap = (text, from, to, file) => {
  if (!text.includes(from)) { console.error(`${file} 에서 바꿀 줄을 찾지 못했어요:\n  ${from}\n이 줄을 지우거나 고쳤다면 make-demo.mjs 의 해당 줄도 맞춰 주세요.`); process.exit(1); }
  return text.replace(from, to);
};

let app = readFileSync(join(MAIN, 'index.html'), 'utf8');
app = swap(app, "let participantId = (params.get('id') || '').trim() || null;",
  "let participantId = (params.get('id') || '').trim() || '0417';   // 시연용: 번호 없이 열면 샘플 항목으로 바로 시작", 'main/index.html');
writeFileSync(join(OUT, 'app.html'), app);

let dsp = readFileSync(join(MAIN, 'display.html'), 'utf8');
dsp = swap(dsp, "const DEMO = params.has('demo');",
  "const DEMO = true;   // 시연용 사이트: 서버 없이 몇 초마다 시험용 초롱이 떠오름", 'main/display.html');
writeFileSync(join(OUT, 'display.html'), dsp);

cpSync(join('demo-wrapper', 'index.html'), join(OUT, 'index.html'));

console.log('demo 폴더를 만들었어요. 배포하려면:\n  npx wrangler@4 pages deploy demo --project-name sugung-roomb-demo --branch main');

#!/usr/bin/env node
/**
 * scripts/import/new-journal.mjs — 复盘导入（T4.3 / A4 拥有）
 *
 * 做什么：把"人写的原始笔记"转成一个**合法但未定稿**的 journal 条目草稿。
 * 不做什么（硬约束，见 docs/IMPORT.md §3）：
 *   - 不自动抓取任何数据源（不读 vault、不读第三方笔记应用、不联网）
 *   - 不生成用户没写过的内容：did/learned 一律留「（待填写）」占位，正文只搬 --from 里的原文
 *   - 不写 published / published_by / approved_by / approved_at 的实值
 *   - 不 approve、不 commit、不 merge、不部署
 *
 * 用法：
 *   node scripts/import/new-journal.mjs --date 2026-11-08
 *   node scripts/import/new-journal.mjs --date 2026-11-08 --from F:\141-vault\intake\2026-11-08.md
 *   node scripts/import/new-journal.mjs --date 2026-11-08 --from note.md --title "选了 Astro 而不是 Next" --dry-run
 *
 * 退出码：0 成功；1 用法错误/拒绝覆盖；2 生成后校验未通过（文件已写出，需人工修）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

/* ----------------------------- 参数 ----------------------------- */

function parseArgs(argv) {
  const a = { date: null, from: null, title: null, energy: null, out: null, force: false, dryRun: false, validate: true };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--date': a.date = argv[++i]; break;
      case '--from': a.from = argv[++i]; break;
      case '--title': a.title = argv[++i]; break;
      case '--energy': a.energy = argv[++i]; break;
      case '--out': a.out = argv[++i]; break;
      case '--force': a.force = true; break;
      case '--dry-run': a.dryRun = true; break;
      case '--no-validate': a.validate = false; break;
      case '-h':
      case '--help': a.help = true; break;
      default:
        if (arg.startsWith('-')) { a.bad = arg; }
    }
  }
  return a;
}

const HELP = `复盘导入（生成 draft 草稿，不发布）

  node scripts/import/new-journal.mjs --date YYYY-MM-DD [选项]

选项
  --date <YYYY-MM-DD>   必填，复盘对应的日期（同时决定 id 与文件路径）
  --from <文件>          把该文件的正文搬进「原始记录」；可省略（只生成骨架）
  --title <标题>         省略时用 "YYYY-MM-DD 复盘"
  --energy <1..5>        省略则不写 energy 字段
  --out <路径>           自定义输出路径（默认 content/journal/<年>/<日期>.md）
  --dry-run              只打印，不写文件
  --force                已存在时允许覆盖——但若已有 published:true 会直接拒绝
  --no-validate          写完不跑校验（默认会跑）
  -h, --help             显示本帮助
`;

/* --------------------------- 小工具 ---------------------------- */

const isRealDate = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

/** 去掉文件开头的 YAML frontmatter（用户拿别的模板写的笔记常带一层） */
function stripFrontmatter(text) {
  const m = String(text).match(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return m ? text.slice(m[0].length) : text;
}

/** 单行化，避免把用户的多行缩进塞进 YAML 标量 */
const oneLine = (s) => String(s).replace(/\s+/g, ' ').trim();

/* --------------------------- 生成 ------------------------------ */

function buildEntry({ date, title, body, energy }) {
  const lines = [
    '---',
    `id: DJ-${date}`,
    'type: journal',
    `title: ${title}`,
    `summary: （待填写）一句话说清 ${date} 最重要的一件事，20–60 字。`,
    `created: ${date}`,
    `updated: ${date}`,
    'tags: [review]',
    'sample: false',
    'vault_ref: null',
    `date: ${date}`,
    'review_status: draft',
    'source: agent-drafted',
    'approved_at: null',
  ];
  if (energy) lines.push(`energy: ${energy}`);
  lines.push(
    'did:',
    '  - （待填写）今天实际完成的具体事项，一条一句，写结果不写心情',
    'learned:',
    '  - （待填写）今天真正学到的东西，能复述给别人听才算',
    'blocked: []',
    'tomorrow: []',
    'linked_knowledge: []',
    'linked_projects: []',
    'linked_errors: []',
    'raw_source: null',
    '---',
    '',
    '## 原始记录',
    '',
    body && body.trim() ? body.trim() : '（待填写：把当天的原始笔记贴在这里。）',
    '',
    '## 补充说明',
    '',
    '（可选：为什么做这件事、当时的判断依据、后来发现哪里想错了。）',
    '',
  );
  return lines.join('\n');
}

/* ----------------------------- 主流程 -------------------------- */

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) { console.log(HELP); process.exit(0); }
  if (args.bad) { console.error(`未知参数：${args.bad}\n`); console.log(HELP); process.exit(1); }
  if (!args.date) { console.error('缺少 --date\n'); console.log(HELP); process.exit(1); }
  if (!isRealDate(args.date)) { console.error(`--date 必须是真实日期 YYYY-MM-DD（实际 "${args.date}"）`); process.exit(1); }
  if (args.energy && !/^[1-5]$/.test(String(args.energy))) { console.error('--energy 只能是 1..5 的整数'); process.exit(1); }

  const date = args.date;
  const year = date.slice(0, 4);
  const outPath = args.out
    ? path.resolve(REPO_ROOT, args.out)
    : path.join(REPO_ROOT, 'content', 'journal', year, `${date}.md`);
  const relOut = path.relative(REPO_ROOT, outPath).split(path.sep).join('/');

  // 已存在：默认拒绝。--force 也不许覆盖已发布条目。
  if (fs.existsSync(outPath)) {
    const existing = fs.readFileSync(outPath, 'utf8');
    if (/^published:\s*true\s*$/m.test(existing)) {
      console.error(`拒绝：${relOut} 已存在且 published: true。脚本不会覆盖已发布内容。`);
      process.exit(1);
    }
    if (!args.force) {
      console.error(`拒绝：${relOut} 已存在。确认要覆盖请加 --force（已发布条目不在此列）。`);
      process.exit(1);
    }
  }

  let body = '';
  if (args.from) {
    const fromPath = path.resolve(process.cwd(), args.from);
    if (!fs.existsSync(fromPath)) { console.error(`--from 文件不存在：${fromPath}`); process.exit(1); }
    body = stripFrontmatter(fs.readFileSync(fromPath, 'utf8'));
  }

  const title = args.title ? oneLine(args.title) : `${date} 复盘`;
  const content = buildEntry({ date, title, body, energy: args.energy });

  if (args.dryRun) {
    console.log(`--- dry-run：将写入 ${relOut} ---\n`);
    console.log(content);
    process.exit(0);
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content, 'utf8');
  console.log(`已写入 ${relOut}`);
  console.log('状态：review_status=draft，无 published / approved_by —— 不会上站。');
  console.log('下一步：');
  console.log('  1) 把 did / learned / summary 里的「（待填写）」换成你自己的话');
  console.log('  2) npm run validate');
  console.log('  3) 提交 PR → 用户审核 → 合并');

  if (!args.validate) process.exit(0);

  try {
    execFileSync(process.execPath, [path.join(REPO_ROOT, 'scripts', 'validate-content.mjs')], { stdio: 'inherit' });
    process.exit(0);
  } catch {
    console.error('\n校验未通过（文件已写出）。按上面的报错改完再提交。');
    process.exit(2);
  }
}

main();

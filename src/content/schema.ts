/**
 * src/content/schema.ts — CONTRACTS.md v1.0.0-rc3 的唯一代码实现（A2 拥有，见 AGENTS.md §3）
 *
 * 字段逐字对应：
 *   C-3 公共 frontmatter
 *   C-5 knowledge 专属字段
 *   C-6 projects 专属字段
 *   C-7 journal 专属字段（含审批矩阵 P1-1）
 *   C-8 errors 专属字段
 *
 * 三重用途：
 *   1. `src/content.config.ts` → Astro content collections 构建期校验
 *   2. `scripts/validate-content.mjs` → PR 门禁（V-001..V-021 / W-001..W-005）
 *   3. 纯函数 `isPublishable()` / `isJournalVisible()` → `src/lib/collections.ts` 的唯一发布过滤
 *
 * 约定：所有自定义 zod 消息前缀内嵌 `V-*` 编号，校验器按编号原样输出，不做二次翻译。
 * 改本文件的字段 = 改契约 = 必须走 docs/rfc/（C-15）。
 */
import { z } from 'zod';

/** 对应 CONTRACTS.md 的版本号（契约撕裂时用于对照） */
export const CONTRACT_VERSION = '1.0.0-rc3';

/* ------------------------------------------------------------------ *
 * C-1 / C-2 类型、目录与 id
 * ------------------------------------------------------------------ */

export const CONTENT_TYPES = ['profile', 'knowledge', 'project', 'journal', 'error'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

/** C-1：目录名 → C-3 的 type 枚举值（V-012 用） */
export const DIR_TO_TYPE = Object.freeze({
  profile: 'profile',
  knowledge: 'knowledge',
  projects: 'project',
  journal: 'journal',
  errors: 'error',
});

/** C-1：content/ 下允许的子目录（多一个即契约撕裂） */
export const ALLOWED_CONTENT_DIRS = Object.keys(DIR_TO_TYPE);

/** C-2：各类型 id 正则 */
export const ID_PATTERN = Object.freeze({
  profile: /^profile$/,
  knowledge: /^KB-[A-Z]{2,6}-\d{3}$/,
  project: /^PJ-[A-Z0-9]{2,8}$/,
  journal: /^DJ-\d{4}-\d{2}-\d{2}$/,
  error: /^ER-\d{8}-\d{2}$/,
});

/** C-2：knowledge id 的 DOMAIN 段 = domain 枚举的大写缩写 */
export const DOMAIN_CODES = Object.freeze({
  engineering: 'ENG',
  product: 'PRD',
  design: 'DSN',
  data: 'DAT',
  finance: 'FIN',
  language: 'LNG',
  health: 'HLT',
  life: 'LIF',
  meta: 'MET',
});

/** C-4 枚举（唯一来源：校验器与页面均从这里取，禁止各自硬编码） */
export const ENUMS = Object.freeze({
  // 用 as const 固定为元组：z.enum 需要 readonly [string, ...string[]]，普通 string[] 过不了类型检查
  domain: ['engineering', 'product', 'design', 'data', 'finance', 'language', 'health', 'life', 'meta'] as const,
  knowledgeStatus: ['seed', 'verified', 'stale', 'archived'] as const,
  confidence: ['low', 'medium', 'high'] as const,
  sourceKind: ['url', 'book', 'paper', 'course', 'person', 'experience', 'agent'] as const,
  projectStatus: ['idea', 'active', 'paused', 'shipped', 'archived'] as const,
  errorSeverity: ['low', 'medium', 'high'] as const,
  evidenceKind: ['commit', 'pr', 'log', 'url', 'none'] as const,
  journalReviewStatus: ['draft', 'approved'] as const,
  journalSource: ['self-reported', 'agent-drafted'] as const,
});

/** C-9：类型 → 路由段（path 不含 base 前缀，见 C-10） */
export const ROUTE_SEGMENT = Object.freeze({
  knowledge: 'knowledge',
  project: 'projects',
  journal: 'journal',
  error: 'errors',
});

/** C-9：v0.1 的固定路由（W-005 用；详情路由按条目动态生成） */
export const STATIC_ROUTES = ['/', '/about/', '/knowledge/', '/projects/', '/journal/', '/errors/', '/search/', '/404.html'];

/* ------------------------------------------------------------------ *
 * 人工标识（V-019）
 * ------------------------------------------------------------------ */

/** 只允许人工标识；后续若要加固定标识，改这里 + CONTRACTS C-7 硬规则 2 */
export const HUMAN_ACTORS = Object.freeze(['user']);

/** 明显非人工的标识（小写比较） */
const NON_HUMAN_ACTOR = /^(agent|bot|system|ai|assistant|automation|llm|gpt|claude|codex|a[1-5])$/i;

export function isHumanActor(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (v === '') return false;
  if (NON_HUMAN_ACTOR.test(v)) return false;
  // 非白名单但也不像机器人 → 视为未登记的人工标识，仍按 V-019 拦（宁可误拦不放过）
  return HUMAN_ACTORS.includes(v);
}

/* ------------------------------------------------------------------ *
 * 受控标签（W-001）—— 必须与 docs/TAXONOMY.md §3 同步
 * （单测会比对两份清单，防止只改一边）
 * ------------------------------------------------------------------ */

export const CONTROLLED_TAGS = Object.freeze([
  // 工程
  'git', 'testing', 'debugging', 'ci-cd', 'architecture', 'typescript', 'javascript', 'python', 'node', 'sql',
  'performance', 'security', 'refactoring', 'tooling', 'windows',
  // 产品
  'requirement', 'scope', 'roadmap', 'user-research', 'tradeoff', 'mvp',
  // 设计
  'layout', 'typography', 'accessibility', 'responsive', 'color',
  // 数据
  'metric', 'visualization', 'statistics', 'data-modeling',
  // 财务
  'budget', 'investing', 'pricing',
  // 语言
  'english', 'writing', 'speaking', 'vocabulary',
  // 健康
  'sleep', 'exercise', 'energy',
  // 生活
  'habit', 'routine', 'travel',
  // 元认知
  'learning', 'review', 'mental-model', 'agent-collaboration', 'decision-making', 'note-taking',
  // 跨域高频
  'workflow', 'documentation', 'automation', 'knowledge-base',
]);

/* ------------------------------------------------------------------ *
 * 基础校验件
 * ------------------------------------------------------------------ */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;
const TAG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** C-18：只允许仓库外相对路径，不允许其他协议、不允许绝对路径、不允许 .. 上跳 */
const VAULT_REF_RE = /^vault:(?!\/)(?!.*\.\.)[A-Za-z0-9._\-/]+$/;

export const TAGS_MAX = 12;

/** 真实存在的日历日期（`2026-02-30` 必须被判非日期） */
export function isRealDate(value: unknown): boolean {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isRealMonth(value: unknown): boolean {
  if (typeof value !== 'string' || !MONTH_RE.test(value)) return false;
  const [y, m] = value.split('-').map(Number);
  return m >= 1 && m <= 12 && y >= 1900 && y <= 2999;
}

/**
 * YAML 解析器差异吸收：js-yaml 的 DEFAULT_SCHEMA 会把 `2026-11-06` 解析成 Date 对象。
 * 无论上游给的是 Date 还是字符串，统一归一为 `YYYY-MM-DD` 字符串再校验，
 * 避免"人写的 frontmatter 明明对、校验器却说类型错"这类假红灯。
 */
export function toDateString(value: unknown): unknown {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return value;
}

/**
 * 带编号的日期字段。
 * code 决定报哪个校验编号：entry 内的 created/updated → V-007。
 */
function dateField(field: string, code = 'V-007') {
  return z.preprocess(
    toDateString,
    z.string().superRefine((value, ctx) => {
      if (!DATE_RE.test(value)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${code} ${field} 必须是 YYYY-MM-DD 格式（实际 "${value}"）` });
        return;
      }
      if (!isRealDate(value)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${code} ${field} 不是真实存在的日期（实际 "${value}"）` });
      }
    }),
  );
}

function optionalDateField(field: string, code: string) {
  return z.preprocess(
    toDateString,
    z
      .string()
      .superRefine((value, ctx) => {
        if (!isRealDate(value)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${code} ${field} 必须是真实日期 YYYY-MM-DD（实际 "${value}"）` });
        }
      })
      .nullable(),
  ).optional();
}

const monthField = (field: string) =>
  z.string().superRefine((value, ctx) => {
    if (!isRealMonth(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `V-003 ${field} 必须是 YYYY-MM 格式（实际 "${value}"）` });
    }
  });

const nonEmptyString = (field: string) =>
  z.string().superRefine((value, ctx) => {
    if (value.trim() === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `V-002 ${field} 不能为空字符串` });
    }
  });

/** C-3：tags 0..12 项、小写 kebab-case（V-014） */
const tagsField = z
  .array(
    z.string().superRefine((value, ctx) => {
      if (!TAG_RE.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `V-014 标签 "${value}" 必须是小写 kebab-case（仅 a-z0-9-，且不以 - 开头/结尾）`,
        });
      }
      if (value.length < 2 || value.length > 24) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `V-014 标签 "${value}" 长度必须 2..24 字符（TAXONOMY §2）` });
      }
    }),
  )
  .max(TAGS_MAX, { message: `V-014 tags 最多 ${TAGS_MAX} 项（当前超过，说明该内容应当拆分）` })
  .default([]);

/** C-18：vault_ref 指针（V-020） */
const vaultRefField = z
  .string()
  .superRefine((value, ctx) => {
    if (!VAULT_REF_RE.test(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `V-020 vault_ref 必须形如 "vault:<仓库外相对路径>"，不得使用其他协议、绝对路径或 ..（实际 "${value}"）`,
      });
    }
  })
  .nullable()
  .optional();

const humanActorField = (field: string) =>
  z
    .string()
    .superRefine((value, ctx) => {
      if (!isHumanActor(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `V-019 ${field} 必须是人工标识（当前允许：${HUMAN_ACTORS.join('/')}；实际 "${value}"）`,
        });
      }
    })
    .nullable()
    .optional();

/* ------------------------------------------------------------------ *
 * C-3 公共 frontmatter
 * ------------------------------------------------------------------ */

/** 引用型字段不做正则校验：格式非法但"看起来像 id"的值必须走到 V-008（R-02 的要求） */
const refList = z.array(z.string().min(1, { message: 'V-003 引用 id 不能为空字符串' })).default([]);

function baseShape(type: ContentType) {
  return {
    id: z.string().superRefine((value, ctx) => {
      if (!ID_PATTERN[type].test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `V-004 id 不符合 ${type} 规范 ${ID_PATTERN[type]}（实际 "${value}"）`,
        });
      }
    }),
    type: z.enum(CONTENT_TYPES, {
      errorMap: () => ({ message: `V-003 type 必须是 ${CONTENT_TYPES.join('|')} 之一` }),
    }),
    title: z
      .string()
      .min(4, { message: 'V-003 title 长度必须 4..80 字符' })
      .max(80, { message: 'V-003 title 长度必须 4..80 字符' }),
    summary: z
      .string()
      .min(20, { message: 'V-013 summary 长度必须 20..200 字符' })
      .max(200, { message: 'V-013 summary 长度必须 20..200 字符' }),
    created: dateField('created'),
    updated: dateField('updated'),
    // P0-1：默认 false，缺字段 = 不发布
    published: z.boolean().default(false),
    published_at: optionalDateField('published_at', 'V-007'),
    published_by: humanActorField('published_by'),
    tags: tagsField,
    sample: z.boolean().default(false),
    vault_ref: vaultRefField,
  };
}

/** C-3 + C-7 的公共跨字段规则 */
function commonRefine(data: any, ctx: any) {
  if (isRealDate(data.created) && isRealDate(data.updated) && data.updated < data.created) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['updated'], message: 'V-007 updated 不得早于 created' });
  }

  if (data.published === true) {
    // V-021：published=true 必须留审批证据
    if (!data.published_at) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['published_at'], message: 'V-021 published: true 时 published_at 必填' });
    }
    if (!data.published_by) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['published_by'], message: 'V-021 published: true 时 published_by 必填' });
    }
  }
}

/* ------------------------------------------------------------------ *
 * C-5 knowledge
 * ------------------------------------------------------------------ */

export const sourceSchema = z
  .object({
    kind: z.enum(ENUMS.sourceKind, {
      errorMap: () => ({ message: `V-003 source.kind 必须是 ${ENUMS.sourceKind.join('|')} 之一` }),
    }),
    ref: nonEmptyString('source.ref'),
    locator: z.string().optional(),
    accessed: optionalDateField('source.accessed', 'V-007'),
    note: z.string().optional(),
  })
  .strict();

export const knowledgeSchema = z
  .object({
    ...baseShape('knowledge'),
    domain: z.enum(ENUMS.domain, {
      errorMap: () => ({ message: `V-003 domain 必须是 ${ENUMS.domain.join('|')} 之一` }),
    }),
    status: z.enum(ENUMS.knowledgeStatus, {
      errorMap: () => ({ message: `V-003 status 必须是 ${ENUMS.knowledgeStatus.join('|')} 之一` }),
    }),
    confidence: z.enum(ENUMS.confidence, {
      errorMap: () => ({ message: `V-003 confidence 必须是 ${ENUMS.confidence.join('|')} 之一` }),
    }),
    sources: z.array(sourceSchema).default([]),
    related: refList,
  })
  .strict()
  .superRefine((data, ctx) => {
    commonRefine(data, ctx);

    // C-2：id 的 DOMAIN 段必须与 domain 一致（映射 V-004：id 不符合类型规范）
    if (ID_PATTERN.knowledge.test(data.id) && ENUMS.domain.includes(data.domain)) {
      const expected = `KB-${DOMAIN_CODES[data.domain as keyof typeof DOMAIN_CODES]}-`;
      if (!data.id.startsWith(expected)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['id'],
          message: `V-004 id 的 DOMAIN 段必须与 domain 一致（domain=${data.domain} → 前缀 ${expected}，实际 "${data.id}"）`,
        });
      }
    }

    // V-009：知识必须可追溯
    if (data.status === 'verified' && data.sources.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sources'],
        message: 'V-009 status: verified 时 sources 不得为空（无来源的知识不得标 verified）',
      });
    }
    if (data.confidence === 'high' && !data.sources.some((s) => s.kind !== 'agent')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confidence'],
        message: 'V-009 confidence: high 时至少需要 1 个 kind != agent 的来源',
      });
    }
  });

/* ------------------------------------------------------------------ *
 * C-6 projects
 * ------------------------------------------------------------------ */

export const projectSchema = z
  .object({
    ...baseShape('project'),
    status: z.enum(ENUMS.projectStatus, {
      errorMap: () => ({ message: `V-003 status 必须是 ${ENUMS.projectStatus.join('|')} 之一` }),
    }),
    role: nonEmptyString('role'),
    period: z
      .object({
        start: monthField('period.start'),
        end: monthField('period.end').nullable(),
      })
      .strict(),
    stack: z.array(nonEmptyString('stack[]')),
    links: z
      .array(z.object({ label: nonEmptyString('links[].label'), url: z.string().url({ message: 'V-003 links[].url 必须是合法 URL' }) }).strict())
      .optional(),
    outcomes: z.array(nonEmptyString('outcomes[]')).min(1, { message: 'V-002 outcomes 必填且至少 1 项（必须是可验证结果）' }),
    linked_knowledge: refList,
    linked_errors: refList,
  })
  .strict()
  .superRefine((data, ctx) => {
    commonRefine(data, ctx);
    if (
      data.period &&
      isRealMonth(data.period.start) &&
      typeof data.period.end === 'string' &&
      isRealMonth(data.period.end) &&
      data.period.end < data.period.start
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['period', 'end'], message: 'V-003 period.end 不得早于 period.start' });
    }
  });

/* ------------------------------------------------------------------ *
 * C-7 journal（含 P1-1 审批矩阵）
 * ------------------------------------------------------------------ */

export const journalSchema = z
  .object({
    ...baseShape('journal'),
    date: dateField('date', 'V-017'),
    review_status: z.enum(ENUMS.journalReviewStatus, {
      errorMap: () => ({ message: `V-003 review_status 必须是 ${ENUMS.journalReviewStatus.join('|')} 之一` }),
    }),
    source: z.enum(ENUMS.journalSource, {
      errorMap: () => ({ message: `V-003 source 必须是 ${ENUMS.journalSource.join('|')} 之一` }),
    }),
    approved_at: optionalDateField('approved_at', 'V-007'),
    approved_by: humanActorField('approved_by'),
    energy: z
      .number()
      .int({ message: 'V-003 energy 必须是 1..5 的整数' })
      .min(1, { message: 'V-003 energy 必须是 1..5 的整数' })
      .max(5, { message: 'V-003 energy 必须是 1..5 的整数' })
      .optional(),
    did: z.array(nonEmptyString('did[]')).min(1, { message: 'V-002 did 必填且至少 1 项' }),
    learned: z.array(nonEmptyString('learned[]')).min(1, { message: 'V-002 learned 必填且至少 1 项' }),
    blocked: z.array(nonEmptyString('blocked[]')).default([]),
    tomorrow: z.array(nonEmptyString('tomorrow[]')).default([]),
    linked_knowledge: refList,
    linked_projects: refList,
    linked_errors: refList,
    raw_source: z
      .string()
      .superRefine((value, ctx) => {
        if (!VAULT_REF_RE.test(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `V-020 raw_source 只能指向仓库外私密库，必须形如 "vault:<相对路径>"（实际 "${value}"）`,
          });
        }
      })
      .nullable()
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    commonRefine(data, ctx);

    // P1-1 / V-011：agent-drafted + approved 必须留人工审批证据
    if (data.source === 'agent-drafted' && data.review_status === 'approved') {
      if (!data.approved_at) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['approved_at'], message: 'V-011 source: agent-drafted 且 review_status: approved 时 approved_at 必填' });
      }
      if (!data.approved_by) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['approved_by'], message: 'V-011 source: agent-drafted 且 review_status: approved 时 approved_by 必填' });
      }
    }
    // self-reported + approved：审批字段建议填，不强制（C-7 审批矩阵第 2 行）

    // C-1/C-2：journal 的 id 由文件名派生，格式一致性由 V-017 在脚本侧校验
  });

/* ------------------------------------------------------------------ *
 * C-8 errors
 * ------------------------------------------------------------------ */

const FIVE_ELEMENTS = ['symptom', 'context', 'root_cause', 'fix', 'prevention'] as const;

export const errorSchema = z
  .object({
    ...baseShape('error'),
    occurred: dateField('occurred'),
    severity: z.enum(ENUMS.errorSeverity, {
      errorMap: () => ({ message: `V-003 severity 必须是 ${ENUMS.errorSeverity.join('|')} 之一` }),
    }),
    symptom: z.string().min(8, { message: 'V-016 symptom 必填且 ≥8 字符' }),
    context: z.string().min(8, { message: 'V-016 context 必填且 ≥8 字符' }),
    root_cause: z.string().min(8, { message: 'V-016 root_cause 必填且 ≥8 字符' }),
    fix: z.string().min(8, { message: 'V-016 fix 必填且 ≥8 字符' }),
    prevention: z.string().min(8, { message: 'V-016 prevention 必填且 ≥8 字符' }),
    evidence: z
      .array(
        z
          .object({
            kind: z.enum(ENUMS.evidenceKind, {
              errorMap: () => ({ message: `V-003 evidence.kind 必须是 ${ENUMS.evidenceKind.join('|')} 之一` }),
            }),
            ref: nonEmptyString('evidence.ref'),
          })
          .strict(),
      )
      .default([]),
    project: z
      .string()
      .superRefine((value, ctx) => {
        if (!ID_PATTERN.project.test(value)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `V-004 project 必须是 project id（${ID_PATTERN.project}）` });
        }
      })
      .nullable()
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    commonRefine(data, ctx);
    for (const field of FIVE_ELEMENTS) {
      if (typeof data[field] === 'string' && data[field].trim().length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `V-016 ${field} 必填且 ≥8 字符（"只抱怨没沉淀"不算错误经验）`,
        });
      }
    }
  });

/* ------------------------------------------------------------------ *
 * 类型 → schema 映射
 * ------------------------------------------------------------------ */

export const SCHEMA_BY_TYPE = Object.freeze({
  profile: z.object(baseShape('profile')).strict().superRefine(commonRefine),
  knowledge: knowledgeSchema,
  project: projectSchema,
  journal: journalSchema,
  error: errorSchema,
});

/* ------------------------------------------------------------------ *
 * 校验结果归一化：zod issue → { code, field, message }
 * ------------------------------------------------------------------ */

const CODE_RE = /\b([VW]-\d{3})\b/;

/** 无显式编号的 zod issue 按类型兜底映射 */
function fallbackCode(issue: any) {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      // 字段完全缺失 → 公共必填字段缺失；类型写错 → 类型非法
      return issue.received === 'undefined' ? 'V-002' : 'V-003';
    default:
      return 'V-003';
  }
}

/**
 * @returns {{code:string, field:string, message:string}}
 */
export function normalizeIssue(issue: any) {
  const field = issue.path.length > 0 ? issue.path.join('.') : '(root)';
  const raw = issue.message ?? '';
  const matched = CODE_RE.exec(raw);
  const code = matched ? matched[1] : fallbackCode(issue);
  const message = (matched ? raw.replace(CODE_RE, '').trim() : raw) || '字段不合法';
  return { code, field, message };
}

/**
 * 用某个类型的 schema 校验一份 frontmatter。
 * @param {ContentType} type
 * @param {unknown} data
 * @returns {{ok:boolean, data?:any, issues:Array<{code:string,field:string,message:string}>}}
 */
export function parseEntry(type: string, data: unknown) {
  const schema = SCHEMA_BY_TYPE[type as ContentType];
  if (!schema) {
    return { ok: false, issues: [{ code: 'V-003', field: 'type', message: `未知类型 "${type}"` }] };
  }
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, data: result.data, issues: [] };
  return { ok: false, issues: result.error.issues.map(normalizeIssue) };
}

/* ------------------------------------------------------------------ *
 * C-3 / C-10 发布过滤（纯函数，唯一实现处）
 * ------------------------------------------------------------------ */

/**
 * 是否达到"可上站"状态：published === true 且 published_by 为人工标识。
 * 缺字段 = 不发布（P0-1：published 默认 false）。
 */
export function isPublishable(data: any) {
  if (!data || typeof data !== 'object') return false;
  return data.published === true && isHumanActor(data.published_by);
}

/**
 * journal 额外要求 review_status: approved（C-7 / C-9 第 7 行）。
 * 其他类型只要 isPublishable 即可。
 */
export function isJournalVisible(data: any) {
  return isPublishable(data) && data.review_status === 'approved';
}

/**
 * 统一入口：页面、content.json、搜索索引都只认这个判定（ARCHITECTURE §4 禁止散落）。
 */
export function isVisibleEntry(entry: any) {
  const data = entry?.data ?? entry;
  if (!data || typeof data !== 'object') return false;
  if (data.type === 'journal') return isJournalVisible(data);
  return isPublishable(data);
}

/** C-10：path 不含 base 前缀 */
export function pathForEntry(type: string, id: string): string {
  switch (type) {
    case 'knowledge':
      return `/knowledge/${String(id).toLowerCase()}/`;
    case 'project':
      return `/projects/${String(id).toLowerCase()}/`;
    case 'journal':
      return `/journal/${String(id).replace(/^DJ-/, '')}/`;
    case 'error':
      return `/errors/${String(id).toLowerCase()}/`;
    case 'profile':
      return '/about/';
    default:
      return '/';
  }
}

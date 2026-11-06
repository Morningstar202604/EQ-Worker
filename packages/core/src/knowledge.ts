/**
 * 礼俗知识库：把硬编码的规则变成可加载、可扩充、可覆盖的数据。
 *
 * 为什么需要：
 * 现在礼貌规则写在 etiquette.ts 里，7 条、13 个场合，是全国通行版。
 * 但中国的礼俗是「一县一规矩」——用户在杭州，他需要的是杭州的行情；
 * 用户是湖南人，白事可能讲「单数 + 不能送双」以外还有本地讲究。
 * 硬编码永远追不上，所以做成数据包。
 *
 * 设计：
 * - 内置一套 base（= 现有 etiquette.ts 的规则），保底可用。
 * - 用户可导入 overlay（按地区/家族），按 priority 覆盖 base。
 * - 不做任何网络请求；导入靠文件或粘贴。
 * - 每条规则都带「来源」与「适用范围」，避免用户误以为全国统一。
 */

export type RuleSeverity = 'high' | 'normal';

/** 一条礼俗规则。 */
export interface EtiquetteRule {
  id: string;
  /** 适用场合；空数组表示所有场合。 */
  occasions: string[];
  /** 适用关系身份；空数组表示所有身份。 */
  identities?: string[];
  severity: RuleSeverity;
  text: string;
  /** 来源标注，例如「全国通行」「杭州本地」「家族习惯」。 */
  source?: string;
}

/** 一份礼俗包。 */
export interface EtiquettePack {
  /** 包标识，用于覆盖与卸载。 */
  id: string;
  /** 显示名。 */
  name: string;
  /** 生效地区/圈子，仅作展示与筛选。 */
  scope?: string;
  /** 优先级：数值大的覆盖数值小的同名规则。内置包为 0。 */
  priority: number;
  rules: EtiquetteRule[];
}

/** 行情参考：某地区某场合的常见金额区间。 */
export interface MarketRate {
  id: string;
  scope: string;
  occasion: string;
  identity?: string;
  low: number;
  high: number;
  /** 数据来源与时间，便于判断是否过时。 */
  source?: string;
  updatedAt?: string;
}

/** 知识库：礼俗包 + 行情表。 */
export interface KnowledgeBase {
  packs: EtiquettePack[];
  rates: MarketRate[];
}

/** 内置基础规则（与 etiquette.ts 保持一致，作为保底）。 */
const BASE_PACK_RAW: EtiquettePack = {
  id: 'base',
  name: '全国通行',
  scope: '全国',
  priority: 0,
  rules: [
    { id: 'funeral-red', occasions: ['白事'], severity: 'high', text: '白事不穿红、不戴喜色首饰；帛金用素色（白/素）信封，别用红封。', source: '全国通行' },
    { id: 'funeral-congrats', occasions: ['白事'], severity: 'high', text: '忌说「恭喜」「好日子」「再见」，忌在灵前寒暄太久；「节哀」二字足够。', source: '全国通行' },
    { id: 'funeral-parity', occasions: ['白事'], severity: 'normal', text: '帛金多取单数（如 301、501），各地有差异；喜事的双数吉数不要套用。', source: '全国通行' },
    { id: 'funeral-visit-time', occasions: ['白事'], severity: 'normal', text: '吊唁宜早不宜迟，错过出殡几乎无法补；到场比随礼更重要。', source: '全国通行' },
    { id: 'sick-pear', occasions: ['探病'], severity: 'high', text: '探病忌送梨（谐音「离」）、白菊、钟表；也避开病人忌口的东西。', source: '全国通行' },
    { id: 'sick-time', occasions: ['探病'], severity: 'normal', text: '避开手术当天与午休时段，探视宜短；多问「需要我做什么」少讲大道理。', source: '全国通行' },
    { id: 'sick-money', occasions: ['探病'], severity: 'normal', text: '探病以实物慰问（水果、营养品）为主；若关系很近或对方确有经济压力，再考虑现金，量力而行。', source: '全国通行' },
    { id: 'joy-even', occasions: ['婚礼', '满月', '乔迁', '寿宴', '升学', '开业', '生日', '节日'], severity: 'normal', text: '喜事礼金偏好双数与 6/8/9，忌 4；具体吉数各地不同，按当地习惯调整。', source: '全国通行' },
    { id: 'joy-clock', occasions: ['婚礼', '满月', '乔迁', '寿宴', '升学', '开业', '生日', '节日'], severity: 'high', text: '不送钟（谐音「送终」）、不送伞（「散」）、不送鞋（「邪」）；长辈尤其忌讳。', source: '全国通行' },
    { id: 'elder-birthday', occasions: ['寿宴'], severity: 'normal', text: '寿礼忌钟表、鞋、伞；寿桃/寿面/茶叶更稳妥。部分地区讲究「过九不过十」，先问一句。', source: '全国通行' },
    { id: 'leader-cash', occasions: [], identities: ['领导', '客户'], severity: 'high', text: '给领导、公职或采购岗送现金/购物卡，在多数单位属违规，也有合规风险；以集体名义或实物更稳妥。', source: '全国通行' }
  ]
};

/** 内置包对外只读，防止被意外修改。 */
export const BASE_PACK: Readonly<EtiquettePack> = Object.freeze(BASE_PACK_RAW);

/** 空知识库：只有内置包，没有行情。 */
export function emptyKnowledgeBase(): KnowledgeBase {
  return { packs: [BASE_PACK as EtiquettePack], rates: [] };
}

/**
 * 校验一份外部导入的礼俗包。
 * 宁可拒绝也不要让半截坏数据进来——错误的礼俗建议比没有建议更糟。
 */
export function validatePack(raw: unknown): { ok: true; pack: EtiquettePack } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: '不是合法的礼俗包（应为对象）' };
  }
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id.trim() : '';
  const name = typeof o.name === 'string' ? o.name.trim() : '';
  if (!id) return { ok: false, error: '缺少 id' };
  if (!name) return { ok: false, error: '缺少 name' };
  if (!Array.isArray(o.rules)) return { ok: false, error: '缺少 rules 数组' };
  const priority = typeof o.priority === 'number' && Number.isFinite(o.priority) ? o.priority : 0;
  const rules: EtiquetteRule[] = [];
  for (let i = 0; i < o.rules.length; i++) {
    const r = o.rules[i] as Record<string, unknown> | null;
    if (!r || typeof r !== 'object') return { ok: false, error: `第 ${i + 1} 条规则格式不对` };
    const rid = typeof r.id === 'string' ? r.id.trim() : '';
    const text = typeof r.text === 'string' ? r.text.trim() : '';
    if (!rid) return { ok: false, error: `第 ${i + 1} 条规则缺少 id` };
    if (!text) return { ok: false, error: `第 ${i + 1} 条规则缺少 text` };
    const occasions = Array.isArray(r.occasions)
      ? (r.occasions as unknown[]).filter((x): x is string => typeof x === 'string')
      : [];
    const identities = Array.isArray(r.identities)
      ? (r.identities as unknown[]).filter((x): x is string => typeof x === 'string')
      : undefined;
    const severity: RuleSeverity = r.severity === 'high' ? 'high' : 'normal';
    rules.push({
      id: rid,
      occasions,
      ...(identities ? { identities } : {}),
      severity,
      text,
      ...(typeof r.source === 'string' ? { source: r.source } : {})
    });
  }
  return {
    ok: true,
    pack: {
      id,
      name,
      ...(typeof o.scope === 'string' ? { scope: o.scope } : {}),
      priority,
      rules
    }
  };
}

/**
 * 合并多份礼俗包：同 id 规则按 priority 高者胜出。
 * 返回合并后的规则数组，顺序稳定（先按包优先级，再按包内顺序）。
 */
export function mergePacks(packs: EtiquettePack[]): EtiquetteRule[] {
  const byId = new Map<string, { rule: EtiquetteRule; priority: number }>();
  const sorted = [...packs].sort((a, b) => a.priority - b.priority);
  for (const pack of sorted) {
    for (const rule of pack.rules) {
      // 后遍历的优先级更高，直接覆盖
      byId.set(rule.id, { rule, priority: pack.priority });
    }
  }
  return [...byId.values()].map((x) => x.rule);
}

/** 取某场合适用的规则（含身份过滤）。 */
export function rulesFor(
  kb: KnowledgeBase,
  occasion: string,
  identity = ''
): EtiquetteRule[] {
  const merged = mergePacks(kb.packs);
  return merged.filter((r) => {
    if (r.occasions.length && !r.occasions.includes(occasion)) return false;
    if (r.identities && r.identities.length && !r.identities.includes(identity)) return false;
    return true;
  });
}

/**
 * 用本地行情校准礼金建议。
 * 返回 null 表示没有匹配的行情数据——此时应明确告诉用户「暂无本地行情」，
 * 而不是拿全国标准冒充本地数据。
 */
export function localMarketRate(
  kb: KnowledgeBase,
  occasion: string,
  scope?: string,
  identity?: string
): MarketRate | null {
  const candidates = kb.rates.filter((r) => r.occasion === occasion);
  if (!candidates.length) return null;
  const byScope = scope ? candidates.filter((r) => r.scope === scope) : [];
  const pool = byScope.length ? byScope : candidates;
  const byIdentity = identity ? pool.filter((r) => r.identity === identity) : [];
  const finalPool = byIdentity.length ? byIdentity : pool.filter((r) => !r.identity);
  return finalPool[0] ?? pool[0] ?? null;
}

/** 校验行情条目，导入时用。 */
export function validateRate(raw: unknown): { ok: true; rate: MarketRate } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: '行情条目格式不对' };
  const o = raw as Record<string, unknown>;
  const scope = typeof o.scope === 'string' ? o.scope.trim() : '';
  const occasion = typeof o.occasion === 'string' ? o.occasion.trim() : '';
  const low = Number(o.low);
  const high = Number(o.high);
  if (!scope) return { ok: false, error: '行情缺少 scope（地区）' };
  if (!occasion) return { ok: false, error: '行情缺少 occasion（场合）' };
  if (!Number.isFinite(low) || !Number.isFinite(high) || low < 0 || high < low) {
    return { ok: false, error: '行情金额不合法（需 0 ≤ low ≤ high）' };
  }
  const id = typeof o.id === 'string' && o.id ? o.id : `${scope}-${occasion}-${low}-${high}`;
  return {
    ok: true,
    rate: {
      id,
      scope,
      occasion,
      low,
      high,
      ...(typeof o.identity === 'string' ? { identity: o.identity } : {}),
      ...(typeof o.source === 'string' ? { source: o.source } : {}),
      ...(typeof o.updatedAt === 'string' ? { updatedAt: o.updatedAt } : {})
    }
  };
}

/** 解析导入的完整知识库文件（可只含 packs 或只含 rates）。 */
export function importKnowledge(raw: unknown): { ok: true; kb: KnowledgeBase } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: '不是合法的知识库文件' };
  }
  const o = raw as Record<string, unknown>;
  const packs: EtiquettePack[] = [BASE_PACK as EtiquettePack];
  if (Array.isArray(o.packs)) {
    for (let i = 0; i < o.packs.length; i++) {
      const v = validatePack(o.packs[i]);
      if (!v.ok) return { ok: false, error: `第 ${i + 1} 份礼俗包：${v.error}` };
      if (v.pack.id === BASE_PACK.id) continue; // 不允许外部覆盖内置包
      packs.push(v.pack);
    }
  }
  const rates: MarketRate[] = [];
  if (Array.isArray(o.rates)) {
    for (let i = 0; i < o.rates.length; i++) {
      const v = validateRate(o.rates[i]);
      if (!v.ok) return { ok: false, error: `第 ${i + 1} 条行情：${v.error}` };
      rates.push(v.rate);
    }
  }
  if (packs.length === 1 && rates.length === 0) {
    return { ok: false, error: '文件里没有可导入的礼俗包或行情' };
  }
  return { ok: true, kb: { packs, rates } };
}

/**
 * 搜索查询改写：把「用户/模型想知道的」翻译成「搜索引擎能检到的」。
 *
 * 为什么需要：
 * 实测 cn.bing.com 对中文长查询会做降级匹配——以名词开头的短语
 * （「同事结婚随礼一般给多少」）会被拆成首词的词条结果（返回「同事」百科）。
 * 而口语疑问式查询（「份子钱一般给多少」）能命中真实经验贴。
 *
 * 这不是玄学，是搜索词的「疑问尾」触发了问答型结果。
 * 所以这里把用户的自然语言意图映射成一组已验证有效的检索词。
 *
 * 同时保留原始查询作为最后一条，避免映射表没覆盖的意图被丢掉。
 */

/** 一次查询改写的产物：主查询 + 若干备选。 */
export interface QueryPlan {
  /** 原始意图（用户或模型给的）。 */
  original: string;
  /** 建议优先执行的查询，按预期效果排序。 */
  queries: string[];
}

const OCCASION_TERMS: Record<string, string[]> = {
  婚礼: ['份子钱一般给多少', '结婚随礼多少合适', '婚礼礼金行情'],
  满月: ['满月酒随礼多少', '满月红包给多少合适'],
  乔迁: ['乔迁随礼送什么好', '搬家随礼多少合适'],
  寿宴: ['长辈寿宴送什么', '寿礼送什么好'],
  白事: ['白事随礼多少', '丧事随礼有什么讲究'],
  探病: ['探病送什么好', '探病有什么讲究和禁忌'],
  升学: ['升学宴随礼多少', '孩子考上大学随礼多少'],
  开业: ['开业送礼送什么好', '开业随礼多少合适'],
  生日: ['生日礼物送什么好', '长辈生日送什么'],
  节日: ['过节送礼送什么好', '节日送礼有什么讲究'],
  还礼: ['还礼怎么还合适', '回礼送什么好'],
  日常: ['请人吃饭怎么点菜', '日常走动人情的讲究']
};

const IDENTITY_TERMS: Record<string, string[]> = {
  领导: ['给领导送礼送什么', '给领导送礼的讲究'],
  客户: ['给客户送礼送什么合适', '商务送礼的讲究'],
  同事: ['同事之间人情往来讲究', '同事结婚随多少'],
  长辈: ['给长辈送礼送什么', '长辈寿礼有什么讲究'],
  朋友: ['朋友之间随礼的讲究', '朋友结婚随多少'],
  家人: ['家人之间要不要随礼', '家里人随礼的讲究']
};

/**
 * 识别文本里出现的场合与身份。用于把自然语言归一成检索词。
 * 只做包含匹配，不做复杂 NLP——覆盖常见说法即可。
 */
export function detectContext(text: string): { occasion: string; identity: string } {
  const t = String(text || '');
  let occasion = '';
  let identity = '';
  for (const key of Object.keys(OCCASION_TERMS)) {
    if (t.includes(key)) { occasion = key; break; }
  }
  // 同义说法
  if (!occasion) {
    if (/结婚|婚礼|婚宴|喜酒/.test(t)) occasion = '婚礼';
    else if (/满月|百日|百天/.test(t)) occasion = '满月';
    else if (/搬家|新居|乔迁/.test(t)) occasion = '乔迁';
    else if (/寿|大寿|过生日/.test(t)) occasion = '寿宴';
    else if (/丧|白事|过世|去世|吊唁|帛金/.test(t)) occasion = '白事';
    else if (/住院|生病|探病|慰问/.test(t)) occasion = '探病';
    else if (/升学|考上|录取/.test(t)) occasion = '升学';
    else if (/开业|开张/.test(t)) occasion = '开业';
  }
  for (const key of Object.keys(IDENTITY_TERMS)) {
    if (t.includes(key)) { identity = key; break; }
  }
  return { occasion, identity };
}

/**
 * 生成查询计划。
 * @param intent 用户/模型的自然语言意图
 * @param hints 已知的场合/身份（来自结构化数据，比从文本猜更可靠）
 */
export function planQueries(
  intent: string,
  hints: { occasion?: string; identity?: string } = {}
): QueryPlan {
  const raw = String(intent || '').trim();
  const detected = detectContext(raw);
  const occasion = hints.occasion || detected.occasion;
  const identity = hints.identity || detected.identity;
  const out: string[] = [];

  /* 组合词不能机械拼接——「同事」+「婚礼」+「之间人情往来讲究」会变成
     「同事婚礼之间人情往来讲究」，实测命中「同事」词条。
     只有身份词库里本身就以该身份开头的短语才拼场合，否则直接用场合词。 */
  if (identity && occasion && IDENTITY_TERMS[identity]) {
    const candidate = IDENTITY_TERMS[identity].find((t) => t.startsWith(identity) && t.includes(occasion));
    if (candidate) out.push(candidate);
    else if (identity === '同事' && occasion === '婚礼') out.push('同事结婚随多少');
    else if (identity === '朋友' && occasion === '婚礼') out.push('朋友结婚随多少');
  }
  // 场合专属检索词（优先级高于身份，因为「份子钱一般给多少」这类口语词最稳）
  if (occasion && OCCASION_TERMS[occasion]) {
    out.push(...OCCASION_TERMS[occasion]);
  }
  // 3) 身份专属检索词
  if (identity && IDENTITY_TERMS[identity]) {
    out.push(...IDENTITY_TERMS[identity]);
  }
  // 4) 原始意图兜底（去掉过长修饰）
  if (raw) out.push(raw);
  if (!out.length) out.push('人情往来 讲究');

  // 去重、限制条数（多查一次就多一次请求，不值得）
  return { original: raw, queries: [...new Set(out)].slice(0, 3) };
}

/**
 * 判断一组搜索结果是否「明显不相关」。
 * 实测 Bing 对长查询会返回「首词词条」，这类结果标题往往只有 2-4 个字 + 百科后缀。
 * 命中这个特征时应当换下一个查询，而不是把垃圾喂给模型。
 */
export function looksIrrelevant(query: string, titles: string[]): boolean {
  if (!titles.length) return true;

  /* 判据一：词条结果。
     实测「同事结婚随多少」会返回「同事（汉语词语）_百度百科」——标题里确实含
     「同事」二字，只看关键词重合会误判为相关。这类结果的特征是：
     整条标题就是查询里的前几个字 + 百科/词典后缀。 */
  const ENCYCLOPEDIA = /_百度百科|_百度汉语|_汉典|汉语词语|_维基百科|新华字典|汉语国学|拼音|怎么读|组词|部首|笔画/;
  const wordEntry = titles.filter((t) => ENCYCLOPEDIA.test(String(t))).length;
  if (wordEntry / titles.length >= 0.5) return true;

  /* 判据二：意图词覆盖。
     查询里的「意图词」（给多少 / 送什么 / 讲究 / 忌讳…）必须至少命中一个，
     否则说明搜索引擎只是在匹配实体名，没理解问题。 */
  const INTENT = /多少|几多|送什么|买什么|讲究|忌讳|禁忌|规矩|合适|行情|标准|怎么|如何|要不要|能不能/;
  if (INTENT.test(query)) {
    const hasIntent = titles.some((t) => INTENT.test(String(t)));
    if (!hasIntent) return true;
  }

  // 判据三：至少一条结果与查询共享一个二字组，避免完全跑题
  const q = query.replace(/\s+/g, '');
  const related = titles.filter((title) => {
    for (let i = 0; i + 1 < q.length; i++) {
      if (String(title).includes(q.slice(i, i + 2))) return true;
    }
    return false;
  }).length;
  return related === 0;
}

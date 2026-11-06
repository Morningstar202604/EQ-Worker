/**
 * 礼俗：红白事的「不能做什么」。
 *
 * 为什么单独成模块：随礼参谋只回答「给多少」，但中国人情里第一道门槛是
 * 「别送错、别说错」。金额错了是失礼，忌讳踩了是结仇——后者代价高得多，
 * 而且几乎都能在事前判定。这里只收全国通行、争议最小的规则；
 * 地域性讲究差异太大，一律标注「以当地习惯为准」，不冒充标准答案。
 */

/** 一段礼俗提示。severity 用于 UI 分级：high 会直接劝退，normal 是提示。 */
export interface EtiquetteTip {
  id: string;
  scene: string;
  severity: 'high' | 'normal';
  text: string;
}

interface Rule {
  id: string;
  scene: string;
  severity: 'high' | 'normal';
  match: (occasion: string) => boolean;
  text: string;
}

const isFuneral = (o: string): boolean => o === '白事';
const isJoy = (o: string): boolean =>
  ['婚礼', '满月', '乔迁', '寿宴', '升学', '开业', '生日', '节日'].includes(o);
const isSick = (o: string): boolean => o === '探病';

const RULES: Rule[] = [
  {
    id: 'funeral-red',
    scene: '白事',
    severity: 'high',
    match: isFuneral,
    text: '白事不穿红、不戴喜色首饰；帛金用素色（白/素）信封，别用红封。'
  },
  {
    id: 'funeral-congrats',
    scene: '白事',
    severity: 'high',
    match: isFuneral,
    text: '忌说「恭喜」「好日子」「再见」，忌在灵前寒暄太久；「节哀」二字足够。'
  },
  {
    id: 'funeral-parity',
    scene: '白事',
    severity: 'normal',
    match: isFuneral,
    text: '帛金多取单数（如 301、501），各地有差异；喜事的双数吉数不要套用。'
  },
  {
    id: 'funeral-visit-time',
    scene: '白事',
    severity: 'normal',
    match: isFuneral,
    text: '吊唁宜早不宜迟，错过出殡几乎无法补；到场比随礼更重要。'
  },
  {
    id: 'sick-pear',
    scene: '探病',
    severity: 'high',
    match: isSick,
    text: '探病忌送梨（谐音「离」）、白菊、钟表；也避开病人忌口的东西。'
  },
  {
    id: 'sick-time',
    scene: '探病',
    severity: 'normal',
    match: isSick,
    text: '避开手术当天与午休时段，探视宜短；多问「需要我做什么」少讲大道理。'
  },
  {
    id: 'sick-money',
    scene: '探病',
    severity: 'normal',
    match: isSick,
    text: '探病以实物慰问（水果、营养品）为主；若关系很近或对方确有经济压力，再考虑现金，量力而行。'
  },
  {
    id: 'joy-even',
    scene: '喜事',
    severity: 'normal',
    match: isJoy,
    text: '喜事礼金偏好双数与 6/8/9，忌 4；具体吉数各地不同，按当地习惯调整。'
  },
  {
    id: 'joy-clock',
    scene: '喜事',
    severity: 'high',
    match: (o) => isJoy(o) || o === '生日',
    text: '不送钟（谐音「送终」）、不送伞（「散」）、不送鞋（「邪」）；长辈尤其忌讳。'
  },
  {
    id: 'elder-birthday',
    scene: '寿宴',
    severity: 'normal',
    // 只对长辈/家人提示；给同龄朋友看「长辈寿礼忌……」会答非所问。
    match: (o) => o === '寿宴',
    text: '寿礼忌钟表、鞋、伞；寿桃/寿面/茶叶更稳妥。部分地区讲究「过九不过十」，先问一句。'
  },
  {
    id: 'leader-cash',
    scene: '职场合规',
    severity: 'high',
    // 覆盖所有会送现金的场合（含日常、还礼）；这类风险与场合无关。
    match: () => true,
    text: '给领导、公职或采购岗送现金/购物卡，在多数单位属违规，也有合规风险；以集体名义或实物更稳妥。'
  }
];

/**
 * 取某场合适用的礼俗提示。
 * @param occasion 场合（如「白事」「婚礼」）
 * @param identity 关系身份（如「领导」「同事」），用于职场合规提示
 */
export function etiquetteTips(occasion: string, identity: string = ''): EtiquetteTip[] {
  const risky = ['领导', '客户'].includes(identity);
  return RULES
    .filter((r) => r.match(occasion))
    .filter((r) => r.id !== 'leader-cash' || risky)
    .map((r) => ({ id: r.id, scene: r.scene, severity: r.severity, text: r.text }));
}



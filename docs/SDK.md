# EQ-Worker SDK

中国人情往来的计算引擎。**纯函数、零依赖、可离线运行**，把「随礼该给多少、这句该怎么说、这段关系该怎么处」做成可编程能力。

## 为什么会有这个包

中国人情往来有一套没写进任何文档的规则：白事帛金取单数、喜事忌 4、还礼不能低于来礼、红白事不能等额对冲、给领导送现金有合规风险。这些规则散落在习俗里，每个做相关产品的人都要重写一遍，而且很容易写错。

这个 SDK 把它们整理成可调用、可测试、可扩展的代码。

## 安装

```bash
# 从本仓库构建
node scripts/build-sdk.mjs

# 产物
dist-sdk/eq-worker-sdk.mjs   # ESM
dist-sdk/eq-worker-sdk.cjs   # CommonJS
```

零运行时依赖，直接引用即可。

## 快速开始

```js
import { createEmptyState, giftAdvice, buildScripts, etiquetteTips } from './eq-worker-sdk.mjs';

const state = createEmptyState();
state.persons = [
  { id: 'p1', name: '张叔', identity: '长辈', tags: [], birthday: '', anniversary: '',
    likes: '喝茶', taboos: '不喝酒', note: '', adjust: 0, createdAt: Date.now() }
];

// 随礼：给出三档 + 每一档的算法依据
const advice = giftAdvice(state, 'p1', '婚礼');
console.log(advice.low, advice.mid, advice.high);  // 800 1200 1600
console.log(advice.reasons);                        // 为什么是这个数

// 白事自动走单数表
const funeral = giftAdvice(state, 'p1', '白事');
console.log(funeral.mid);                           // 701（单数）

// 话术：三种语气
const script = buildScripts(state, 'thanks', 'p1', '上次帮我引荐了客户');
console.log(script.variants[0].text);

// 礼俗：该避什么
console.log(etiquetteTips('白事').map(t => t.text));
```

## 核心能力

| 能力 | 入口 | 说明 |
|---|---|---|
| 随礼金额 | `giftAdvice(state, personId, occasion, opts)` | 关系 × 场合 × 档位 × 城市，三档 + 依据 |
| 人情账本 | `personLedger` / `balanceByKind` | 借款与礼金**分账**，不混算 |
| 关系健康 | `personHealth` / `healthRanking` | 五维加权，含人情债扣分 |
| 话术生成 | `buildScripts` | 18 场景 × 3 语气 |
| 礼俗禁忌 | `etiquetteTips` / `checkGiftTaboo` | 按场合适配，带高危标记 |
| 今日行动 | `buildActions` | 按优先级生成待办 |
| 修炼题库 | `SCENARIOS` / `commitPractice` | 25 道中国式人情题 |
| 知识库 | `importKnowledge` / `rulesFor` | 礼俗包与本地行情可导入覆盖 |

导出清单见 `dist-sdk/EXPORTS.md`（89 项）。

## 设计约定（重要）

**1. 金额规则分喜事与白事两条轨**

- 喜事：偏好双数与 6/8/9，忌 4，走 `NICE_AMOUNTS`
- 白事：只取单数（101/201/301…），走 `CONDOLENCE_AMOUNTS`

两者共用一套取整会出错，所以 `giftAdvice` 内部按 `occasion` 分流。

**2. 三档的语义**

- 从简：量力而行，**允许低于历史来礼**
- 建议：不低于行情，也**不低于对方给过的数**
- 重视：明显高于建议档

三档必须严格递增。把「从简」也抬到锚点会让三档挤成同一个数字，档位切换就失效了。

**3. 借款与礼金是两本账**

借款要还本金，礼金要在对方办事时还，不能互相折算。`balanceByKind` 返回 `{ loan, gift }`，调用方不要用 `personLedger().net` 去做结清——那个是混算的展示值。

**4. 不猜金额方向**

`dir` 缺失时保持 `none`，不推断成「借入」。猜错的代价是借出 5000 显示「我欠 5000」，方向反一倍。

## 扩展：本地礼俗与行情

全国标准只是起点，真正的讲究是地方性的。

```js
import { importKnowledge, rulesFor, localMarketRate } from './eq-worker-sdk.mjs';

const { kb } = importKnowledge({
  packs: [{
    id: 'hz', name: '杭州习惯', scope: '杭州', priority: 10,
    rules: [{ id: 'hz-wedding', occasions: ['婚礼'], text: '杭州同事婚礼多在 600–800，双数为宜' }]
  }],
  rates: [{ scope: '杭州', occasion: '婚礼', identity: '同事', low: 600, high: 800, source: '本地打听' }]
});

console.log(rulesFor(kb, '婚礼').length);
console.log(localMarketRate(kb, '婚礼', '杭州', '同事'));  // { low: 600, high: 800, ... }
```

导入是**全有或全无**：一条坏数据就让整份文件失败，不做部分导入。错误的礼俗建议比没有建议更糟。

## 边界

这个 SDK **不做**这些事：

- 不做网络请求（联网能力在 `packages/ai`，且默认关闭）
- 不读写文件（存储由调用方提供 adapter）
- 不包含任何用户数据
- 不替你做决定：所有输出都是「参谋」，`note` 字段每次都提醒以当地习惯为准

## 许可

CC BY-NC 4.0：个人使用与学习免费，商业使用需授权。

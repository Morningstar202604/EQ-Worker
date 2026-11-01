import type { AppState, ScriptContext, ScriptResult, ScriptScene, ScriptVariant } from './types';

export const SCRIPT_TONES = [
  { id: 'stable', label: '稳妥版' },
  { id: 'close', label: '亲近版' },
  { id: 'brief', label: '简短版' }
] as const;

export const SCRIPT_SCENES: ScriptScene[] = [
  {
    id: 'reconnect', label: '久未联系破冰', hint: '适合几个月没说话的人，先给台阶再约见',
    build: (c) => ({
      stable: `${c.name}，好久没联系了。最近整理通讯录看到您，想起之前${['talk', 'meal'].includes(c.eventType) && c.eventTitle ? c.eventTitle : '一起聊过的事'}，一直记着。最近还顺利吗？有空我请您喝杯茶。`,
      close: `${c.name}，失踪人口回归一下。最近咋样？刚路过你那边突然想起你，改天约个饭。`,
      brief: `${c.name}，好久不见，最近还好吗？有空聚聚。`
    })
  },
  {
    id: 'thanks', label: '道谢/回馈', hint: '对方帮过你，别只说「谢谢」，给一个具体反馈',
    build: (c) => ({
      stable: `${c.name}，上次${c.eventTitle ? `「${c.eventTitle}」` : '那件事'}多亏您帮忙，事情已经顺利解决了。一直想正式说声谢谢，改天我请您吃个饭。`,
      close: `${c.name}，上次那事真帮我大忙了，记你一辈子。别跟我客气，改天请你吃饭。`,
      brief: `${c.name}，上次的事多谢了，改天请你吃饭。`
    })
  },
  {
    id: 'apology', label: '道歉和解', hint: '先认错、不找借口，再给一个具体的补救动作',
    build: (c) => ({
      stable: `${c.name}，上次${c.context ? `关于${c.context}` : '那件事'}是我考虑不周，让您不舒服了。我不找借口，先跟您说声对不起。如果您愿意，我想找个时间当面聊聊。`,
      close: `${c.name}，上次是我上头了，说话没过脑子。咱俩这么多年，我不想因为这点事生分。给我个机会，请你吃饭赔罪。`,
      brief: `${c.name}，上次的事是我不对，跟你说声抱歉。有空我当面聊。`
    })
  },
  {
    id: 'ask_favor', label: '请人帮忙', hint: '把选择权留给对方，明确「不方便也没关系」',
    build: (c) => ({
      stable: `${c.name}，有个事想请您指点一下${c.context ? `：${c.context}` : ''}。我知道您在这方面有经验，不知道最近方不方便？如果不方便也完全没关系，我再想别的办法。`,
      close: `${c.name}，遇到个坎，第一个想到你${c.context ? `：${c.context}` : ''}。你方便的时候帮我看看，不方便就直说，别为难。`,
      brief: `${c.name}，有个事想请教您${c.context ? `：${c.context}` : ''}，方便时回我就行。`
    })
  },
  {
    id: 'decline', label: '婉拒请求', hint: '先接住对方的面子，再清楚地说「这次不行」',
    build: (c) => ({
      stable: `${c.name}，您说的这事我认真想过了。${c.context ? `关于${c.context}，` : ''}这次我确实帮不上，怕答应了反而耽误您。要是有其他我能做的，您尽管说。`,
      close: `${c.name}，这事我这次真接不住，不是跟你客气。${c.context ? `${c.context}这块我确实没把握。` : ''}下次有我能搭把手的地方，你直接喊我。`,
      brief: `${c.name}，这次实在不方便，帮不上忙，抱歉。`
    })
  },
  {
    id: 'refuse_loan', label: '拒绝借钱', hint: '共情 + 明确边界 + 给替代帮助，别含糊拖成误会',
    build: (c) => ({
      stable: `${c.name}，您开口肯定是遇到难处了。${c.context ? `关于${c.context}，` : ''}不瞒您说，我最近手头也紧，实在拿不出这笔钱。不是不帮，是怕答应了耽误您。`,
      close: `${c.name}，你知道我不是小气的人，但这次真拿不出来。${c.context ? `${c.context}这个数我确实没有。` : ''}要不我帮你想想别的路子？`,
      brief: `${c.name}，这次手头真紧，借不了，抱歉。`
    })
  },
  {
    id: 'collect_debt', label: '催还/提醒', hint: '给具体时间点，语气平和，别让人下不来台',
    build: (c) => ({
      stable: `${c.name}，最近整理账本看到之前${c.context ? c.context : '那笔钱'}，想跟您确认一下大概什么时候方便？我这边最近也有点安排，不着急，您方便时回我就行。`,
      close: `${c.name}，最近手头有点紧，之前${c.context ? c.context : '那笔钱'}你看这周方便先还一部分吗？剩下的咱们再商量。`,
      brief: `${c.name}，之前那笔钱最近方便还吗？我这边有点急用。`
    })
  },
  {
    id: 'gift', label: '随礼/还礼', hint: '金额之外，一句得体的话更重要',
    build: (c) => ({
      stable: `${c.name}，${c.context ? c.context : '您的好日子'}我记着呢。一点心意，不成敬意，祝您一切顺遂。`,
      close: `${c.name}，${c.context ? c.context : '你的事'}就是我的事。红包收下，别跟我客气，改天再聚。`,
      brief: `${c.name}，一点心意，祝好。`
    })
  },
  {
    id: 'toast', label: '敬酒/饭局', hint: '先给对方面子，再表达自己，最后留余地',
    build: (c) => ({
      stable: `${c.name}，这杯我敬您。${c.context ? `${c.context}，` : ''}平时多承您照顾，很多话在酒里了，您随意，我干了。`,
      close: `${c.name}，这杯必须敬你。${c.context ? `${c.context}，` : ''}别的先不说，都在酒里。`,
      brief: `${c.name}，这杯敬您，我干了。`
    })
  },
  {
    id: 'visit_sick', label: '探病/慰问', hint: '少讲大道理，多给具体帮助',
    build: (c) => ({
      stable: `${c.name}，听说您最近身体不太舒服，一直惦记着。${c.context ? `${c.context}` : ''}您先安心养着，有什么需要跑腿的随时招呼我。等我过两天去看您。`,
      close: `${c.name}，听说你住院了，别硬扛。${c.context ? `${c.context}` : ''}需要啥给我发消息，别客气。`,
      brief: `${c.name}，听说您身体不适，多保重，需要帮忙随时说。`
    })
  },
  {
    id: 'decline_invite', label: '婉拒饭局', hint: '拒绝的是这次，不是这段关系',
    build: (c) => ({
      stable: `${c.name}，谢谢您想着我。${c.context ? `${c.context}那天` : ''}我这边刚好有安排，实在去不了，挺遗憾的。下次有机会我来组局，咱们再聚。`,
      close: `${c.name}，这次真去不了，${c.context ? `${c.context}那天` : ''}撞上了。你们玩得开心，下次我请。`,
      brief: `${c.name}，那天实在去不了，抱歉，下次再聚。`
    })
  },
  {
    id: 'festival', label: '节日祝福', hint: '给重要的人单独改一句，别群发',
    build: (c) => ({
      stable: `${c.name}，${c.context ? c.context : '节日'}快乐。过去一年多谢您的关照，祝您和家人身体安康、诸事顺遂。`,
      close: `${c.name}，${c.context ? c.context : '节日'}快乐呀。别的虚的不说，祝你吃好喝好，事事顺心。`,
      brief: `${c.name}，${c.context ? c.context : '节日'}快乐，祝好。`
    })
  },
  {
    id: 'invite', label: '约饭/走动', hint: '给两个时间选项，降低对方决策成本',
    build: (c) => ({
      stable: `${c.name}，最近想起您，不知道这周或下周哪天方便？想请您吃个便饭，地方您定，我过去接您。`,
      close: `${c.name}，好久没聚了，这周有空没？撸串火锅你挑，我请。`,
      brief: `${c.name}，最近有空吗？想约您吃个饭。`
    })
  },
  {
    id: 'follow_up', label: '事后跟进', hint: '让对方知道事情有进展，关系才有下一次',
    build: (c) => ({
      stable: `${c.name}，上次请您帮忙的事已经有进展了${c.context ? `：${c.context}` : ''}，特意跟您说一声，也让您放心。后面有结果我再同步。`,
      close: `${c.name}，上次那事办得差不多了${c.context ? `：${c.context}` : ''}，跟你说一声。回头请你吃饭。`,
      brief: `${c.name}，上次的事有进展了${c.context ? `：${c.context}` : ''}，谢谢您。`
    })
  },
  {
    id: 'birthday', label: '生日祝福', hint: '别只发「生日快乐」，加一个你们之间的细节',
    build: (c) => ({
      stable: `${c.name}，生日快乐！祝您新的一岁身体健康、事事顺心。一点祝福，改天再当面道贺。`,
      close: `${c.name}，生日快乐呀！又长一岁，愿你想要的都拥有，得不到的都释怀。改天聚。`,
      brief: `${c.name}，生日快乐，祝好。`
    })
  },
  {
    id: 'anniversary', label: '纪念日问候', hint: '比生日更私密，适合关系较近的人',
    build: (c) => ({
      stable: `${c.name}，今天是您的重要日子，特意来道声祝福。愿往后每年今日，都有好心情。`,
      close: `${c.name}，纪念日快乐。时间真快，改天见面聊。`,
      brief: `${c.name}，纪念日快乐。`
    })
  }
];

export function buildScripts(state: AppState, sceneId: string, personId: string, context: string): ScriptResult {
  const sc: ScriptScene = SCRIPT_SCENES.find((x) => x.id === sceneId) || SCRIPT_SCENES[0];
  const p = state.persons.find((x) => x.id === personId) || null;
  const evs = p ? state.events.filter((e) => e.personId === p.id).sort((a, b) => b.time - a.time) : [];
  const c: ScriptContext = {
    name: p ? p.name : '朋友',
    identity: p ? p.identity || '朋友' : '',
    likes: p ? p.likes || '' : '',
    taboos: p ? p.taboos || '' : '',
    eventTitle: evs.length ? evs[0].title || '' : '',
    eventType: evs.length ? evs[0].type || '' : '',
    context: (context || '').trim()
  };
  const texts = sc.build(c);
  const variants: ScriptVariant[] = SCRIPT_TONES.map((t) => ({ tone: t.label, id: t.id, text: texts[t.id] }));
  return { scene: sc, person: p, variants };
}

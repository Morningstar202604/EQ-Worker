import {
  DAY,
  EVENT_TYPES,
  type EventType,
  type Person,
  type PersonalEvent,
  type Reminder
} from '../../packages/core/src/index';

export interface DemoPayload {
  schema: number;
  persons: Person[];
  events: PersonalEvent[];
  reminders: Reminder[];
  progress: Record<string, { best: number; times: number }>;
  streak: { n: number; last: string };
  settings: {
    giftTier: 'standard';
    cityTier: '二线';
    ai: { enabled: false; providerId: ''; model: ''; baseUrl: ''; temperature: number };
  };
  meta: { schema: number; updatedAt: number };
}

function mmdd(offsetDays: number, now: number): string {
  const d = new Date(now + offsetDays * DAY);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function event(
  id: string,
  personId: string,
  type: EventType,
  title: string,
  daysAgo: number,
  amount: number,
  dir: 'in' | 'out' | 'none',
  occasion: string,
  now: number
): PersonalEvent {
  return {
    id,
    personId,
    type,
    title,
    time: now - daysAgo * DAY,
    weight: EVENT_TYPES[type].dHeat,
    note: '',
    amount,
    dir,
    occasion
  };
}

export function demoPayload(now: number = Date.now()): DemoPayload {
  const createdAt = now - 240 * DAY;
  const persons: Person[] = [
    {
      id: 'demo-linyue',
      name: '林悦',
      identity: '朋友',
      tags: ['大学同学', '咖啡搭子'],
      birthday: mmdd(3, now),
      anniversary: '',
      likes: '手冲咖啡、旧书市集',
      taboos: '香菜',
      note: '一起做过校园电台，说话直接但不伤人。',
      adjust: 3,
      createdAt
    },
    {
      id: 'demo-zhoumingyuan',
      name: '周明远',
      identity: '领导',
      tags: ['直属上级', '行业前辈'],
      birthday: mmdd(26, now),
      anniversary: '',
      likes: '茶、跑步',
      taboos: '临时改需求',
      note: '带过两个大项目，给过不少资源。',
      adjust: 0,
      createdAt
    },
    {
      id: 'demo-chenjiahe',
      name: '陈嘉禾',
      identity: '同事',
      tags: ['同组', '产品'],
      birthday: '',
      anniversary: '',
      likes: '桌游、精酿',
      taboos: '当众否定方案',
      note: '合作默契，但上季度因为排期吵过一次。',
      adjust: 0,
      createdAt
    },
    {
      id: 'demo-suwan',
      name: '苏婉',
      identity: '家人',
      tags: ['表姐'],
      birthday: mmdd(40, now),
      anniversary: mmdd(5, now),
      likes: '烘焙、绿植',
      taboos: '催婚',
      note: '从小照顾我，遇事第一个想到她。',
      adjust: 5,
      createdAt
    },
    {
      id: 'demo-zhaoqihang',
      name: '赵启航',
      identity: '客户',
      tags: ['重点客户', '制造业'],
      birthday: '',
      anniversary: '',
      likes: '钓鱼、白酒',
      taboos: '迟到',
      note: '合作两年，回款一直守时。',
      adjust: 0,
      createdAt
    },
    {
      id: 'demo-guqing',
      name: '顾清',
      identity: '同学',
      tags: ['高中同学'],
      birthday: mmdd(18, now),
      anniversary: '',
      likes: '羽毛球',
      taboos: '借钱不还',
      note: '上次搬家帮了大忙，还没来得及正式道谢。',
      adjust: 0,
      createdAt
    },
    {
      id: 'demo-heyi',
      name: '何姨',
      identity: '邻居',
      tags: ['楼下邻居'],
      birthday: '',
      anniversary: '',
      likes: '花草',
      taboos: '噪音',
      note: '常年帮忙收快递，过节会送自家做的点心。',
      adjust: 0,
      createdAt
    },
    {
      id: 'demo-xuzhiyuan',
      name: '许知远',
      identity: '长辈',
      tags: ['老师'],
      birthday: '',
      anniversary: '',
      likes: '书法、普洱',
      taboos: '空手上门',
      note: '职业上的引路人，每年教师节都会去看望。',
      adjust: 2,
      createdAt
    }
  ];

  const events: PersonalEvent[] = [
    event('demo-e01', 'demo-linyue', 'help_them', '林悦帮忙内推简历', 60, 0, 'none', '日常', now),
    event('demo-e02', 'demo-linyue', 'meal', '周五火锅局', 10, 0, 'none', '日常', now),
    event('demo-e03', 'demo-linyue', 'gift_get', '生日收到手冲壶', 100, 500, 'in', '生日', now),
    event('demo-e04', 'demo-linyue', 'talk', '深夜聊职业选择', 5, 0, 'none', '日常', now),
    event('demo-e05', 'demo-linyue', 'greeting', '春节祝福', 2, 0, 'none', '节日', now),
    event('demo-e06', 'demo-zhoumingyuan', 'gift_give', '周总女儿婚礼随礼', 30, 800, 'out', '婚礼', now),
    event('demo-e07', 'demo-zhoumingyuan', 'money', '项目垫款周转', 90, 2000, 'out', '其他', now),
    event('demo-e08', 'demo-zhoumingyuan', 'help_me', '帮周总整理行业材料', 15, 0, 'none', '日常', now),
    event('demo-e09', 'demo-chenjiahe', 'meal', '加班后撸串', 20, 0, 'none', '日常', now),
    event('demo-e10', 'demo-chenjiahe', 'conflict', '排期会上起了争执', 40, 0, 'none', '其他', now),
    event('demo-e11', 'demo-chenjiahe', 'gift_get', '搬家收到绿植', 120, 300, 'in', '乔迁', now),
    event('demo-e12', 'demo-suwan', 'gift_give', '表姐乔迁红包', 50, 1200, 'out', '乔迁', now),
    event('demo-e13', 'demo-suwan', 'other', '周末一起包饺子', 8, 0, 'none', '日常', now),
    event('demo-e14', 'demo-zhaoqihang', 'money', '合同预付款', 70, 5000, 'in', '其他', now),
    event('demo-e15', 'demo-zhaoqihang', 'gift_give', '中秋送茶', 25, 600, 'out', '节日', now),
    event('demo-e16', 'demo-guqing', 'help_them', '顾清帮我搬家', 3, 0, 'none', '日常', now),
    event('demo-e17', 'demo-guqing', 'talk', '聊起高中往事', 35, 0, 'none', '日常', now),
    event('demo-e18', 'demo-heyi', 'greeting', '端午送粽子', 6, 0, 'none', '节日', now),
    event('demo-e19', 'demo-xuzhiyuan', 'gift_give', '教师节送普洱', 15, 500, 'out', '节日', now),
    event('demo-e20', 'demo-xuzhiyuan', 'meal', '教师节请老师吃饭', 45, 0, 'none', '日常', now)
  ];

  return {
    schema: 5,
    persons,
    events,
    reminders: [
      {
        id: 'demo-r01',
        personId: 'demo-guqing',
        content: '给顾清补一句正式道谢，约顿饭',
        date: '',
        status: 'pending'
      }
    ],
    progress: {},
    streak: { n: 0, last: '' },
    settings: {
      giftTier: 'standard',
      cityTier: '二线',
      ai: { enabled: false, providerId: '', model: '', baseUrl: '', temperature: 0.7 }
    },
    meta: { schema: 5, updatedAt: now }
  };
}

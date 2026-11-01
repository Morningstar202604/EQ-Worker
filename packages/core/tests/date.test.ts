import { describe, expect, it } from 'vitest';
import { DAY, daysUntil, fmtDate, nextMMDD, solarToLunar, toDateInput, toMMDD, todayStr, upcomingFestival } from '../src/date';

const NOW = new Date(2026, 9, 31, 12, 0, 0).getTime();

describe('date', () => {
  it('生日就是今天返回 0，不会跳到下一年 365', () => {
    expect(daysUntil('10-31', NOW)).toBe(0);
  });

  it('生日明天返回 1', () => {
    expect(daysUntil('11-01', NOW)).toBe(1);
  });

  it('2/29 在非闰年按 2/28 计算', () => {
    const feb28 = new Date(2026, 1, 28, 12).getTime();
    expect(daysUntil('02-29', feb28)).toBe(0);
    expect(toDateInput('02-29', feb28)).toBe('2026-02-28');
  });

  it('solarToLunar：2024-02-10 = 正月初一', () => {
    expect(solarToLunar(new Date(2024, 1, 10))).toEqual({ y: 2024, m: 1, d: 1, leap: false });
  });

  it('upcomingFestival：2026-02-17 当天是春节（days=0）', () => {
    const spring = new Date(2026, 1, 17, 9).getTime();
    expect(upcomingFestival(spring)).toEqual({ n: '春节', days: 0 });
  });

  it('toMMDD 支持 YYYY-MM-DD，非法输入原样返回', () => {
    expect(toMMDD('2020-05-20')).toBe('05-20');
    expect(toMMDD('05-20')).toBe('05-20');
    expect(toMMDD('')).toBe('');
  });

  it('nextMMDD：2/29 非闰年落到 2/28', () => {
    const d = nextMMDD('02-29', new Date(2026, 0, 15, 12).getTime());
    expect(d && fmtDate(d.getTime())).toBe('2026-02-28');
  });

  it('todayStr/fmtDate 使用本地时区格式化', () => {
    expect(fmtDate(NOW)).toBe('2026-10-31');
    expect(todayStr(NOW)).toBe('2026-10-31');
    expect(DAY).toBe(86400000);
  });
});

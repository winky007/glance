// Lunar calendar:
// Prefer built-in Intl Chinese calendar (accurate & offline in modern Chrome),
// fallback to a lightweight algorithm for older environments.

const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5d0, 0x14573, 0x052d0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04bd7, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0
];

const STEMS = "甲乙丙丁戊己庚辛壬癸";
const BRANCHES = "子丑寅卯辰巳午未申酉戌亥";
const ZODIAC = "鼠牛虎兔龙蛇马羊猴鸡狗猪";
const MONTH_CN = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"];
const DAY_CN_PREFIX = ["初", "十", "廿", "三"];
const DAY_CN_NUM = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

function lunarYearDays(y) {
  let sum = 348;
  const info = LUNAR_INFO[y - 1900];
  for (let i = 0x8000; i > 0x8; i >>= 1) sum += info & i ? 1 : 0;
  return sum + leapDays(y);
}

function leapMonth(y) {
  return LUNAR_INFO[y - 1900] & 0xf;
}

function leapDays(y) {
  const lm = leapMonth(y);
  if (lm) return LUNAR_INFO[y - 1900] & 0x10000 ? 30 : 29;
  return 0;
}

function monthDays(y, m) {
  return LUNAR_INFO[y - 1900] & (0x10000 >> m) ? 30 : 29;
}

function cyclical(num) {
  return STEMS[num % 10] + BRANCHES[num % 12];
}

function lunarDayCn(d) {
  if (d === 10) return "初十";
  if (d === 20) return "二十";
  if (d === 30) return "三十";
  const tens = Math.floor((d - 1) / 10);
  const ones = (d - 1) % 10;
  return DAY_CN_PREFIX[tens] + DAY_CN_NUM[ones];
}

function lunarMonthCn(m, isLeap) {
  return (isLeap ? "闰" : "") + MONTH_CN[m - 1] + "月";
}

function legacyToLunar(date) {
  // base date: 1900-01-31 is lunar 1900-01-01
  const base = new Date(1900, 0, 31);
  let offset = Math.floor((date - base) / 86400000);
  if (offset < 0) throw new Error("Date before 1900-01-31 is not supported");

  let year = 1900;
  let daysOfYear = lunarYearDays(year);
  while (offset >= daysOfYear && year < 2101) {
    offset -= daysOfYear;
    year++;
    daysOfYear = lunarYearDays(year);
  }

  const lm = leapMonth(year);
  let isLeap = false;
  let month = 1;
  let daysOfMonth;
  while (month <= 12 && offset >= 0) {
    if (lm > 0 && month === lm + 1 && !isLeap) {
      --month;
      isLeap = true;
      daysOfMonth = leapDays(year);
    } else {
      daysOfMonth = monthDays(year, month);
    }
    if (offset < daysOfMonth) break;
    offset -= daysOfMonth;
    if (isLeap && month === lm) isLeap = false;
    month++;
  }

  const day = offset + 1;
  const cycYear = cyclical(year - 1900 + 36);
  const zodiac = ZODIAC[(year - 1900) % 12];
  return {
    year,
    month,
    day,
    isLeap,
    yearCn: cycYear,
    zodiac,
    monthCn: lunarMonthCn(month, isLeap),
    dayCn: lunarDayCn(day)
  };
}

function zodiacFromGanzhi(gz) {
  const map = {
    子: "鼠",
    丑: "牛",
    寅: "虎",
    卯: "兔",
    辰: "龙",
    巳: "蛇",
    午: "马",
    未: "羊",
    申: "猴",
    酉: "鸡",
    戌: "狗",
    亥: "猪"
  };
  const s = String(gz || "");
  const last = s ? s[s.length - 1] : "";
  return map[last] || "";
}

function toLunar(date) {
  try {
    // Fix repeated "wrong lunar" issues:
    // - Use date-only in a fixed timezone (default Asia/Shanghai) to avoid boundary drift
    // - Parse chinese calendar yearName (乙巳) instead of "year" (often absent)
    const tz = "Asia/Shanghai";

    // Get YYYY-MM-DD in target timezone
    const g = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);
    const gy = Number(g.find((p) => p.type === "year")?.value || 0);
    const gm = Number(g.find((p) => p.type === "month")?.value || 0);
    const gd = Number(g.find((p) => p.type === "day")?.value || 0);
    if (!gy || !gm || !gd) throw new Error("cannot derive tz date");
    const safe = new Date(Date.UTC(gy, gm - 1, gd, 12, 0, 0));

    const fmt = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
      timeZone: tz,
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    if (fmt.resolvedOptions && fmt.resolvedOptions().calendar !== "chinese") {
      throw new Error("Intl chinese calendar not available");
    }

    const parts = fmt.formatToParts(safe);
    const out = { yearCn: "", monthCn: "", dayCn: "" };
    for (const p of parts) {
      if (p.type === "yearName") out.yearCn = p.value;
      if (p.type === "year" && !out.yearCn) out.yearCn = p.value;
      if (p.type === "month") out.monthCn = p.value;
      if (p.type === "day") out.dayCn = p.value;
    }
    out.yearCn = String(out.yearCn || "").replace(/年$/, "");
    out.monthCn = String(out.monthCn || "");
    out.dayCn = String(out.dayCn || "");
    const isLeap = out.monthCn.includes("闰");
    const zodiac = zodiacFromGanzhi(out.yearCn);
    if (out.yearCn && out.monthCn && out.dayCn) {
      return { yearCn: out.yearCn, zodiac, monthCn: out.monthCn, dayCn: out.dayCn, isLeap };
    }
  } catch (e) {
    // ignore and fallback
  }
  // Fallback (may be less reliable on some ranges)
  // Use local noon to reduce boundary issues
  const legacy = legacyToLunar(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0));
  return {
    yearCn: legacy.yearCn,
    zodiac: legacy.zodiac,
    monthCn: legacy.monthCn,
    dayCn: legacy.dayCn,
    isLeap: legacy.isLeap
  };
}

window.CalendarExtLunar = { toLunar };



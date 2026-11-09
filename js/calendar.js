// When each seasonal look shows. This file never touches the page, so the unit tests run it in Node (tests/unit/calendar.test.js).
// Halloween and Christmas have fixed dates; Easter moves every year, so its window is worked out from Easter Sunday.
'use strict';

// A season shows from `from` to `to` (month-day, both days included; a window may cross the new year), or for Easter
// from `before` days before Easter Sunday to `after` days after it. Two weeks before covers the build-up and the UK school
// holiday; a week after it covers the second week of the holiday.
const SEASON_DATES = {
  halloween: { from: '10-15', to: '11-03' },
  christmas: { from: '11-04', to: '01-06' },
  easter: { before: 14, after: 7 },
};

// Easter Sunday in the Gregorian calendar (the anonymous algorithm from Meeus, Jones and Butcher), as a local date.
function easterSunday(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const pad2 = n => String(n).padStart(2, '0');
const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
const dayNumber = date => Math.round(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 864e5);

function inWindow(md, from, to) {
  const afterStart = md >= from, beforeEnd = md <= to;
  return from <= to ? afterStart && beforeEnd : afterStart || beforeEnd;
}
// The first and last day of Easter's window in a year, as local dates
function easterWindow(year, rule = SEASON_DATES.easter) {
  const sunday = easterSunday(year);
  return [addDays(sunday, -rule.before), addDays(sunday, rule.after)];
}
// Does this date fall in this season's window? Gives the year that names the window (Christmas 2026 runs into January
// 2027), or null.
function windowYear(date, rule) {
  if (rule.before != null) {
    const [first, last] = easterWindow(date.getFullYear(), rule);
    return dayNumber(date) >= dayNumber(first) && dayNumber(date) <= dayNumber(last) ? date.getFullYear() : null;
  }
  const md = `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  if (!inWindow(md, rule.from, rule.to)) return null;
  return date.getFullYear() - (rule.from > md ? 1 : 0);
}
// The season whose window holds this date, as { id, key }, or null. The key names that year's window, so a child switching
// the look off lasts one window only. Pure.
function seasonOn(date, rules = SEASON_DATES) {
  for (const id of Object.keys(rules)) {
    const year = windowYear(date, rules[id]);
    if (year != null) return { id, key: `${id}-${year}` };
  }
  return null;
}

// Node loads this file for the unit tests; the browser loads it as a plain script and skips this.
if (typeof module === 'object' && module.exports) module.exports = { SEASON_DATES, easterSunday, easterWindow, seasonOn };

// The calendar: when each seasonal look shows. Easter moves every year, so its window is worked out from Easter Sunday.
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { SEASON_DATES, easterSunday, easterWindow, seasonOn } = require('../../js/calendar.js');

const day = (y, m, d) => new Date(y, m - 1, d); // m is the month as people write it: 1 to 12
const ymd = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

describe('easterSunday', () => {
  // Known Easter Sundays, written out by hand rather than worked out by the same sum
  const KNOWN = { 2024: '2024-03-31', 2025: '2025-04-20', 2026: '2026-04-05', 2027: '2027-03-28', 2028: '2028-04-16', 2029: '2029-04-01',
    2030: '2030-04-21', 2031: '2031-04-13', 2032: '2032-03-28', 2033: '2033-04-17', 2034: '2034-04-09', 2035: '2035-03-25' };
  for (const [year, want] of Object.entries(KNOWN)) {
    it(`is ${want} in ${year}`, () => assert.equal(ymd(easterSunday(+year)), want));
  }
  it('is always a Sunday, between 22 March and 25 April, in the next 200 years', () => {
    for (let year = 2000; year < 2200; year++) {
      const e = easterSunday(year), md = (e.getMonth() + 1) * 100 + e.getDate();
      assert.equal(e.getDay(), 0, `${year} is not a Sunday`);
      assert.ok(md >= 322 && md <= 425, `${year}: ${ymd(e)}`);
    }
  });
});

describe('Easter window', () => {
  it('runs from two weeks before Easter Sunday to a week after it', () => {
    const [first, last] = easterWindow(2027);
    assert.equal(ymd(first), '2027-03-14');
    assert.equal(ymd(last), '2027-04-04');
  });
  it('is on in the window, both ends included, and off a day outside it', () => {
    for (const [date, on] of [[day(2027, 3, 13), false], [day(2027, 3, 14), true], [day(2027, 3, 28), true], [day(2027, 4, 4), true], [day(2027, 4, 5), false]]) {
      const season = seasonOn(date);
      assert.equal(Boolean(season && season.id === 'easter'), on, ymd(date));
    }
  });
  it('moves with Easter: 2 April 2028 is in it, 2 April 2027 is not', () => {
    assert.equal(seasonOn(day(2028, 4, 2)).id, 'easter');
    assert.equal(seasonOn(day(2027, 4, 5)), null);
  });
  it('is named by the year, so switching it off lasts that year only', () => {
    assert.equal(seasonOn(day(2027, 3, 28)).key, 'easter-2027');
    assert.equal(seasonOn(day(2028, 4, 16)).key, 'easter-2028');
  });
  it('never overlaps Halloween or Christmas, in any year', () => {
    for (let year = 2000; year < 2200; year++) {
      const [first, last] = easterWindow(year);
      assert.ok(first >= day(year, 3, 8) && last <= day(year, 5, 2), `${year}: ${ymd(first)} to ${ymd(last)}`);
    }
  });
});

describe('Halloween and Christmas', () => {
  it('keep their fixed dates', () => {
    assert.deepEqual(SEASON_DATES.halloween, { from: '10-15', to: '11-03' });
    assert.equal(seasonOn(day(2026, 10, 14)), null);
    assert.equal(seasonOn(day(2026, 10, 15)).id, 'halloween');
    assert.equal(seasonOn(day(2026, 11, 3)).id, 'halloween');
    assert.equal(seasonOn(day(2026, 11, 4)).id, 'christmas');
  });
  it('lets Christmas run into January, named by the year it started', () => {
    assert.deepEqual(seasonOn(day(2026, 12, 25)), { id: 'christmas', key: 'christmas-2026' });
    assert.deepEqual(seasonOn(day(2027, 1, 6)), { id: 'christmas', key: 'christmas-2026' });
    assert.equal(seasonOn(day(2027, 1, 7)), null);
  });
  it('are off in the summer', () => assert.equal(seasonOn(day(2026, 7, 1)), null));
});

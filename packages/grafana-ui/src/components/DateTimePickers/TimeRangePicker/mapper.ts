import { type TimeOption, type TimeRange, type TimeZone, rangeUtil, dateTimeFormat, isElapsedTimeModeEnabled } from '@grafana/data';

import { getElapsedZeroMs as getElapsedZeroMsFromValue, formatElapsedTimeRangeValue } from '../../../utils/elapsedTime';
import { getFeatureToggle } from '../../../utils/featureToggle';
import { commonFormat } from '../commonFormat';

function getElapsedZeroMs(range: TimeRange): number {
  return getElapsedZeroMsFromValue(range.from.valueOf());
}

export function normalizeElapsedinput(value: string): string {
  const parts = value.split(':');

  if (parts.length === 1) {
    return `${parts[0]}:00:00.0000`;
  }

  if (parts.length === 2) {
    return `${parts[0]}:${parts[1].padStart(2,'0')}:00.0000`;
  }

  if (parts.length === 3) {
    const [hh, mm, sec] = parts;

    if (!sec.includes('.')) {
      return `${hh}:${mm.padStart(2,'0')}:${sec.padStart(2,'0')}.0000`;
    }

    const [ss, ms = ''] = sec.split('.');

    return `${hh}:${mm.padStart(2,'0')}:${ss.padStart(2,'0')}.${ms.padEnd(4,'0')}`;
  }
  return value;
}

export function parseElapsedTimeRangeValue(value: string, zeroMs: number): string {
  value = normalizeElapsedinput(value);
  const match = value.match(/^(\d+):(\d{2}):(\d{2})\.(\d{4})$/);

  if (!match) {
    return value;
  }

  const [, hours, minutes, seconds, fractional] = match;

  const elapsedMs = 
    Number(hours) * 60 * 60 * 1000 +
    Number(minutes) * 60 * 1000 +
    Number(seconds) * 1000 +
    Math.floor(Number(fractional) / 10);

  return dateTimeFormat(zeroMs + elapsedMs, {
    format: commonFormat,
  });

}

/**
 * Takes a printable TimeOption and builds a TimeRange with DateTime properties from it
 */
export const mapOptionToTimeRange = (option: TimeOption, timeZone?: TimeZone): TimeRange => {
  return rangeUtil.convertRawToRange({ from: option.from, to: option.to }, timeZone, undefined, commonFormat);
};

/**
 * Takes a TimeRange and makes a printable TimeOption with formatted date strings correct for the timezone from it
 */
export const mapRangeToTimeOption = (range: TimeRange, timeZone?: TimeZone): TimeOption => {
  if (isElapsedTimeModeEnabled()) {
    const zeroMs = getElapsedZeroMs(range);

    const from = formatElapsedTimeRangeValue(range.from.valueOf(), zeroMs);
    const to = formatElapsedTimeRangeValue(range.to.valueOf(), zeroMs);

    return {
      from,
      to,
      display: `${from} to ${to}`,
    };
  }

  const from = dateTimeFormat(range.from, { timeZone, format: commonFormat });
  const to = dateTimeFormat(range.to, { timeZone, format: commonFormat });

  let display = `${from} to ${to}`;

  if (getFeatureToggle('localeFormatPreference')) {
    display = rangeUtil.describeTimeRange(range, timeZone);
  }

  return {
    from,
    to,
    display,
  };
};

import { dateMath, dateTimeParse, isDateTime, type TimeRange, type TimeZone, isElapsedTimeModeEnabled } from '@grafana/data';

import { commonFormat } from './commonFormat';
import { normalizeElapsedinput } from './TimeRangePicker/mapper';

export function isValid(value: string, roundUp?: boolean, timeZone?: TimeZone): boolean {
  if (isDateTime(value)) {
    return value.isValid();
  }

  // handles `now` math
  if (dateMath.isMathString(value)) {
    return dateMath.isValid(value);
  }

  if (isElapsedTimeModeEnabled()) {
    value = normalizeElapsedinput(value);
    const elapsedRegex = /^\d+:\d{2}:\d{2}\.\d{4}$/;

    if (elapsedRegex.test(value)) {
      return true;
    }
    return false;
  }

  const parsed = dateTimeParse(value, { roundUp, timeZone, format: commonFormat });
  return parsed.isValid();
}

export function isValidTimeRange(range: TimeRange) {
  return dateMath.isValid(range.from) && dateMath.isValid(range.to);
}

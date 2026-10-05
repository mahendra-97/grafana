const MILLISECONDS_IN_YEAR = 365 * 24 * 60 * 60 * 1000;

export function formatElapsedTimeRangeValue(value: number, zeroMs: number): string {
  const valueMs = Number(value);

  if (!Number.isFinite(valueMs)) {
    return 'Invalid date';
  }

  const elapsedMs = Math.max(0, valueMs - zeroMs);
  const totalMilliseconds = Math.floor(elapsedMs);

  const hours = Math.floor(totalMilliseconds / (60 * 60 * 1000));
  const minutes = Math.floor((totalMilliseconds % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((totalMilliseconds % (60 * 1000)) / 1000);

  const fraction4 = Math.floor((totalMilliseconds % 1000) * 10);

  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(fraction4).padStart(4, '0')}`;
}

export function getLocalDayStartMs(value: number): number {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function getElapsedZeroMs(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return value > MILLISECONDS_IN_YEAR ? getLocalDayStartMs(value) : 0;
}

// function getElapsedZeroMsFromUrl(): number | undefined {
//   if (typeof window === 'undefined') {
//     return undefined;
//   }

//   const params = new URLSearchParams(window.location.search);
//   const rawZeroMs = params.get('elapsedZeroMs') ?? params.get('var-elapsedZeroMs');

//   if (!rawZeroMs) {
//     return undefined;
//   }

//   const zeroMs = Number(rawZeroMs);
//   return Number.isFinite(zeroMs) ? zeroMs : undefined;
// }

// export function getElapsedZeroMs(value: number): number {
//   const zeroMs = getElapsedZeroMsFromUrl();

//   if (zeroMs != null) {
//     return zeroMs;
//   }

//   return value > MILLISECONDS_IN_YEAR ? getLocalDayStartMs(value) : 0;
// }

// export function isElapsedTimeModeEnabled(): boolean {
//   if (typeof window === 'undefined') {
//     return false;
//   }

//   const params = new URLSearchParams(window.location.search);

//   return params.get('elapsedTimeMode') === 'true' || params.get('var-elapsedTimeMode') === 'true';
// }
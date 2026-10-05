export function isElapsedTimeModeEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const params = new URLSearchParams(window.location.search);

  return params.get('elapsedTimeMode') === 'true' || params.get('var-elapsedTimeMode') === 'true';
}
const KEY_DEFAULT_NAME = 'nm:defaultCorrectName';

export function getDefaultCorrectName(): string {
  try {
    return localStorage.getItem(KEY_DEFAULT_NAME) ?? 'Nicolai';
  } catch {
    return 'Nicolai';
  }
}

export function setDefaultCorrectName(value: string): void {
  try {
    localStorage.setItem(KEY_DEFAULT_NAME, value);
  } catch {
    // ignore (private mode etc.)
  }
}

/**
 * Production'da console shovqinini kamaytirish.
 * Faqat __DEV__ rejimida log chiqaradi.
 */
export function devLog(...args) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}

export function devWarn(...args) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // eslint-disable-next-line no-console
    console.warn(...args);
  }
}

export function devError(...args) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // eslint-disable-next-line no-console
    console.error(...args);
  }
}

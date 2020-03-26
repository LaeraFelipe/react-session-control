export function debounce(func: Function, delay: number) {
  let timeoutRef: any;
  return function (...params: any) {
    clearTimeout(timeoutRef);
    setTimeout(() => func(...params), delay)
  }
}

export function throttle(func: Function, wait: number) {
  let inThrottle: boolean;
  return function (...params: any) {
    if (!inThrottle) {
      func(...params);
      inThrottle = true
      setTimeout(() => inThrottle = false, wait)
    }
  }
}
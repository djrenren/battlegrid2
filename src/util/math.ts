/** Find the greatest common denominator */
export const gcd = (a: number, b: number): number => {
  if (!b) {
    return a;
  }

  return gcd(b, a % b);
};

/** Find all whole-numbers dividers shared by both numbers */
export const common_dividers = (a: number, b: number): number[] => {
  const d = gcd(a, b);
  return factors(d);
};

/** Gets the factors of a given number */
export const factors = (n: number) => {
  const numbers = Array.from(Array(n + 1), (_, i) => i);
  return numbers.filter((i) => n % i === 0);
};

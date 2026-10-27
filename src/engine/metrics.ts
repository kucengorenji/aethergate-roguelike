/** Rolling window of samples (e.g. per-step CPU time) with cheap summary stats. */
export class RollingStats {
  private readonly samples: number[] = [];

  constructor(private readonly capacity = 600) {}

  push(value: number): void {
    this.samples.push(value);
    if (this.samples.length > this.capacity) this.samples.shift();
  }

  summary(): { count: number; avg: number; p95: number; max: number } {
    const n = this.samples.length;
    if (n === 0) return { count: 0, avg: 0, p95: 0, max: 0 };
    const sorted = [...this.samples].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    return {
      count: n,
      avg: sum / n,
      p95: sorted[Math.min(n - 1, Math.floor(n * 0.95))]!,
      max: sorted[n - 1]!,
    };
  }

  clear(): void {
    this.samples.length = 0;
  }
}

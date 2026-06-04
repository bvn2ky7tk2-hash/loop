import { Injectable } from '@nestjs/common';

/**
 * Registry metrics in-process, xuất theo định dạng Prometheus text (zero-dependency).
 * Đủ để Prometheus/Grafana scrape: request rate, latency (histogram), error rate per route,
 * + metrics tiến trình. Cardinality thấp: route = "Controller.handler" (không kèm path param).
 */
@Injectable()
export class MetricsService {
  // Bucket latency (giây) — cho phép tính p50/p95/p99 qua histogram_quantile.
  private readonly BUCKETS = [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

  // Counter: key = chuỗi nhãn đầy đủ `name{labels}` → giá trị.
  private readonly counters = new Map<string, number>();
  // Histogram: key = `name{labels}` (không hậu tố) → {sum, count, buckets cộng dồn}.
  private readonly histos = new Map<
    string,
    { labels: string; sum: number; count: number; buckets: number[] }
  >();

  observeHttp(method: string, route: string, status: number, durationSec: number): void {
    const lbl = `method="${method}",route="${this.esc(route)}"`;
    this.incCounter(`http_requests_total{${lbl},status="${status}"}`);
    this.observeHisto('http_request_duration_seconds', lbl, durationSec);
  }

  private incCounter(series: string): void {
    this.counters.set(series, (this.counters.get(series) ?? 0) + 1);
  }

  private observeHisto(name: string, labels: string, v: number): void {
    const key = `${name}{${labels}}`;
    let h = this.histos.get(key);
    if (!h) {
      h = { labels, sum: 0, count: 0, buckets: new Array(this.BUCKETS.length).fill(0) };
      this.histos.set(key, h);
    }
    h.sum += v;
    h.count += 1;
    for (let i = 0; i < this.BUCKETS.length; i++) if (v <= this.BUCKETS[i]) h.buckets[i] += 1;
  }

  private esc(s: string): string {
    return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  /** Xuất toàn bộ metrics theo định dạng Prometheus text exposition (v0.0.4). */
  render(): string {
    const out: string[] = [];

    out.push('# HELP http_requests_total Tổng số HTTP request theo route + status');
    out.push('# TYPE http_requests_total counter');
    for (const [series, val] of this.counters) out.push(`${series} ${val}`);

    out.push('# HELP http_request_duration_seconds Thời gian xử lý HTTP request (giây)');
    out.push('# TYPE http_request_duration_seconds histogram');
    for (const h of this.histos.values()) {
      let cumulative = 0;
      for (let i = 0; i < this.BUCKETS.length; i++) {
        cumulative = h.buckets[i];
        out.push(`http_request_duration_seconds_bucket{${h.labels},le="${this.BUCKETS[i]}"} ${cumulative}`);
      }
      out.push(`http_request_duration_seconds_bucket{${h.labels},le="+Inf"} ${h.count}`);
      out.push(`http_request_duration_seconds_sum{${h.labels}} ${h.sum.toFixed(6)}`);
      out.push(`http_request_duration_seconds_count{${h.labels}} ${h.count}`);
    }

    // Metrics tiến trình (tính lúc render)
    const mem = process.memoryUsage();
    out.push('# HELP nodejs_heap_used_bytes Heap đã dùng', '# TYPE nodejs_heap_used_bytes gauge', `nodejs_heap_used_bytes ${mem.heapUsed}`);
    out.push('# HELP nodejs_heap_total_bytes Heap tổng', '# TYPE nodejs_heap_total_bytes gauge', `nodejs_heap_total_bytes ${mem.heapTotal}`);
    out.push('# HELP nodejs_rss_bytes RSS', '# TYPE nodejs_rss_bytes gauge', `nodejs_rss_bytes ${mem.rss}`);
    out.push('# HELP process_uptime_seconds Uptime tiến trình', '# TYPE process_uptime_seconds gauge', `process_uptime_seconds ${Math.round(process.uptime())}`);

    return out.join('\n') + '\n';
  }
}

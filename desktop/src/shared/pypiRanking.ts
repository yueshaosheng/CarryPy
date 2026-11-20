export interface RankedPackage {
  name: string;
  category: string;
  monthly: number;
}

export interface PackageRanking {
  packages: RankedPackage[];
  source: 'live' | 'bundled';
  fetched_at: string;
}

export function fmtDownloads(n: number): string {
  if (n >= 1e8) return (n / 1e8).toFixed(1) + ' 亿';
  if (n >= 1e4) return Math.round(n / 1e4) + ' 万';
  return String(n);
}
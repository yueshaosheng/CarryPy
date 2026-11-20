import { PackageRanking, RankedPackage } from '@shared/pypiRanking';
import { BUNDLED_RANKING } from '@shared/pypiRankingData';

const CACHE_MS = 10 * 60 * 1000;
let cache: { ts: number; data: PackageRanking } | null = null;

async function fetchMonthly(name: string): Promise<number | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`https://pypistats.org/api/packages/${encodeURIComponent(name)}/recent`, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'CarryPy-Desktop', Accept: 'application/json' }
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: { last_month?: number } };
    return typeof data.data?.last_month === 'number' ? data.data.last_month : null;
  } catch {
    return null;
  }
}

export async function getRanking(force = false): Promise<PackageRanking> {
  if (!force && cache && Date.now() - cache.ts < CACHE_MS) return cache.data;
  if (process.env.CARRYPY_OFFLINE === '1') return { ...BUNDLED_RANKING };

  const base = BUNDLED_RANKING.packages;
  const fetched = await Promise.all(
    base.map(async (p) => ({ p, monthly: await fetchMonthly(p.name) }))
  );
  const okCount = fetched.filter((f) => f.monthly !== null).length;
  const packages: RankedPackage[] = fetched
    .map((f) => (f.monthly !== null ? { ...f.p, monthly: f.monthly } : f.p))
    .sort((a, b) => b.monthly - a.monthly);
  const data: PackageRanking = {
    packages,
    source: okCount > 0 ? 'live' : 'bundled',
    fetched_at: new Date().toISOString()
  };
  cache = { ts: Date.now(), data };
  return data;
}
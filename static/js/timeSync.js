let cachedOffsetMs = 0;
let syncLoaded = false;
let cachedTimezone = 'Etc/UTC';
let pendingPromise = null;

function getDeviceTimezone() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return tz && typeof tz === 'string' ? tz : 'Etc/UTC';
}

export async function loadTimeOffset() {
  const timezone = getDeviceTimezone();
  if (syncLoaded && timezone === cachedTimezone) {
    return cachedOffsetMs;
  }
  if (pendingPromise && timezone === cachedTimezone) {
    return pendingPromise;
  }

  cachedTimezone = timezone;

  pendingPromise = (async () => {
    try {
      const params = new URLSearchParams({ tz: timezone });
      const reqStart = Date.now();
      const resp = await fetch(`/api/time-sync?${params.toString()}`, { cache: 'no-store' });
      const reqEnd = Date.now();
      if (!resp.ok) {
        throw new Error(`time-sync-http-${resp.status}`);
      }
      const data = await resp.json();
      if (!data.isFallback && Number.isFinite(data.serverTimeMs)) {
        const processingMs = Number.isFinite(data.processingMs) ? Math.max(0, data.processingMs) : 0;
        const networkRttMs = Math.max(0, (reqEnd - reqStart) - processingMs);
        const clientAtResponse = reqEnd - networkRttMs / 2;
        cachedOffsetMs = Math.round(data.serverTimeMs - clientAtResponse);
      } else {
        cachedOffsetMs = 0;
      }
    } catch {
      cachedOffsetMs = 0;
    } finally {
      syncLoaded = true;
      pendingPromise = null;
    }
    return cachedOffsetMs;
  })();

  return pendingPromise;
}

export function getSyncedNow() {
  return new Date(Date.now() + cachedOffsetMs);
}

let cachedOffsetMs = 0;
let syncLoaded = false;
let cachedTimezone = 'Etc/UTC';

function getDeviceTimezone(){
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return tz && typeof tz === 'string' ? tz : 'Etc/UTC';
}

export async function loadTimeOffset(){
  const timezone = getDeviceTimezone();
  if(syncLoaded && timezone === cachedTimezone){
    return cachedOffsetMs;
  }

  cachedTimezone = timezone;

  try{
    const params = new URLSearchParams({ tz: timezone });
    const resp = await fetch(`/api/time-sync?${params.toString()}`, { cache: 'no-store' });
    if(!resp.ok){
      throw new Error(`time-sync-http-${resp.status}`);
    }
    const data = await resp.json();
    cachedOffsetMs = Number.isFinite(data.offsetMs) ? data.offsetMs : 0;
  }catch(_err){
    cachedOffsetMs = 0;
  }

  syncLoaded = true;
  return cachedOffsetMs;
}

export function getSyncedNow(){
  return new Date(Date.now() + cachedOffsetMs);
}

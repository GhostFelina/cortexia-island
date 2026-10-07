import type { TariffQuote, TariffRequest } from '../shared/types';
import { TURKEY_CITIES } from '../shared/locations';

export const EPDK_TARIFF_PAGE =
  'https://www.epdk.gov.tr/Detay/Icerik/3-1327/elektrik-faturalarina-esas-tarife-tablolari';
const ORIGIN = 'https://www.epdk.gov.tr';
export function validateTariffRequest(input: unknown): TariffRequest {
  const r = input as TariffRequest;
  if (
    !r ||
    !TURKEY_CITIES.some((c) => c === r.city) ||
    typeof r.district !== 'string' ||
    !r.district.trim() ||
    r.district.length > 60 ||
    !['residential', 'other'].includes(r.subscription) ||
    !['low', 'high'].includes(r.tier)
  )
    throw new Error('Şehir ve semt seçimini kontrol et.');
  if (r.subscription !== 'residential')
    throw new Error(
      'Özel sözleşme, SKTT, çok zamanlı ve ticari abonelik için faturandaki birim fiyatı kullan. Otomatik kurulum ulusal mesken tek zamanlı tarifesini destekliyor.',
    );
  return { ...r, district: r.district.trim() };
}
export function parseResidentialTariff(
  rows: unknown[][],
  request: TariffRequest,
  now: number,
  documentUrl: string,
): TariffQuote {
  validateTariffRequest(request);
  // Tax rules reviewed against official sources for 2026. Fail closed after the reviewed period.
  if (new Date(now).getFullYear() !== 2026)
    throw new Error('Vergi kuralları için güncel uygulama sürümü gerekiyor.');
  const months = [
    'Ocak',
    'Şubat',
    'Mart',
    'Nisan',
    'Mayıs',
    'Haziran',
    'Temmuz',
    'Ağustos',
    'Eylül',
    'Ekim',
    'Kasım',
    'Aralık',
  ];
  const heading = rows
    .flat()
    .find((v) => typeof v === 'string' && v.includes('Vergiler Hariç Elektrik Tarifeleri'));
  const date =
    typeof heading === 'string'
      ? /^(\d{1,2})\s+(\S+)\s+(\d{4})\s+Tarihinden/.exec(heading.trim())
      : null;
  if (!date || !months.includes(date[2]))
    throw new Error('Resmî tablonun tarih/başlık biçimi doğrulanamadı.');
  const effectiveDate = `${date[3]}-${String(months.indexOf(date[2]) + 1).padStart(2, '0')}-${date[1].padStart(2, '0')}`;
  if (effectiveDate > new Date(now).toISOString().slice(0, 10))
    throw new Error('İleri tarihli tarife henüz uygulanamaz.');
  const energyColumn = rows
    .find((r) => r.some((v) => typeof v === 'string' && v.includes('Tek Zamanlı Enerji Bedeli')))
    ?.findIndex(
      (v) =>
        typeof v === 'string' && v.includes('Tek Zamanlı Enerji Bedeli') && v.includes('kr/kWh'),
    );
  const distributionColumn = rows
    .find((r) => r.some((v) => typeof v === 'string' && v.includes('Dağıtım Bedeli')))
    ?.findIndex(
      (v) => typeof v === 'string' && v.includes('Dağıtım Bedeli') && v.includes('kr/kWh'),
    );
  const label = request.tier === 'low' ? 'Mesken (8 kWh/gün ve altı)' : 'Mesken (8 kWh/gün üstü)';
  const matches = rows.filter((r) => r.some((v) => v === label));
  if (
    matches.length !== 1 ||
    energyColumn === undefined ||
    energyColumn < 0 ||
    distributionColumn === undefined ||
    distributionColumn < 0
  )
    throw new Error('Resmî tablonun mesken sütunları doğrulanamadı.');
  const energy = matches[0][energyColumn];
  const distribution = matches[0][distributionColumn];
  if (
    typeof energy !== 'number' ||
    typeof distribution !== 'number' ||
    !Number.isFinite(energy) ||
    !Number.isFinite(distribution) ||
    energy <= 0 ||
    distribution <= 0 ||
    energy > 10000 ||
    distribution > 10000
  )
    throw new Error('Resmî birim fiyat doğrulanamadı.');
  const consumptionTax = (energy / 100) * 0.05;
  const vat = (energy / 100 + distribution / 100 + consumptionTax) * 0.1;
  return {
    price:
      Math.round((energy / 100 + distribution / 100 + consumptionTax + vat) * 1000000) / 1000000,
    energy: energy / 100,
    distribution: distribution / 100,
    consumptionTax,
    vat,
    effectiveDate,
    checkedAt: now,
    documentUrl,
  };
}
async function boundedFetch(url: string, options: RequestInit = {}): Promise<Buffer> {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(12000),
    redirect: 'error',
  });
  if (!response.ok || !response.body)
    throw new Error('EPDK bağlantısı kurulamadı. Tekrar dene veya manuel tarife kullan.');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > 2_000_000) throw new Error('Resmî dosya beklenen boyutu aşıyor.');
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
export async function findOnlineTariff(input: unknown): Promise<TariffQuote> {
  const request = validateTariffRequest(input);
  // No city, district, household consumption or personal identifier is transmitted.
  const data = JSON.parse(
    (
      await boundedFetch(ORIGIN + '/Detay/GetFastAccessList', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ fId: '1327' }),
      })
    ).toString('utf8'),
  );
  if (data.State !== 1 || !Array.isArray(data.model))
    throw new Error('EPDK tarife listesi doğrulanamadı.');
  const candidates = data.model
    .filter(
      (m: { Title?: unknown }) =>
        typeof m.Title === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}/.test(m.Title),
    )
    .sort((a: { Title: string }, b: { Title: string }) => {
      const stamp = (s: string) => {
        const [d, m, y] = s.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)![0].split('/');
        return Number(y) * 10000 + Number(m) * 100 + Number(d);
      };
      return stamp(b.Title) - stamp(a.Title);
    });
  const current = candidates.find((m: { Title: string }) => {
    const [d, month, y] = m.Title.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)![0]
      .split('/')
      .map(Number);
    return Date.UTC(y, month - 1, d) <= Date.now();
  });
  const file = current?.FastAccessDetail?.find(
    (f: { ContentType: number; IsFileType: number }) => f.ContentType === 9 && f.IsFileType === 2,
  );
  if (
    !file ||
    typeof file.ContentId !== 'string' ||
    !/^[A-Za-z0-9+/=]{1,100}$/.test(file.ContentId)
  )
    throw new Error('Güncel EPDK Excel belgesi bulunamadı.');
  const documentUrl = ORIGIN + '/Detay/DownloadDocument?id=' + encodeURIComponent(file.ContentId);
  const { readSheet } = await import('read-excel-file/node');
  const rows = await readSheet(await boundedFetch(documentUrl));
  const quote = parseResidentialTariff(rows, request, Date.now(), documentUrl);
  const titleDate = current.Title.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (
    quote.effectiveDate !==
    `${titleDate[3]}-${titleDate[2].padStart(2, '0')}-${titleDate[1].padStart(2, '0')}`
  )
    throw new Error('Tarife listesi ve dosyanın tarihi uyuşmuyor.');
  return quote;
}

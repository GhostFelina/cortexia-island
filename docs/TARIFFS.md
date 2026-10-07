# Online electricity tariff setup

## Supported flow

First launch opens setup if no tariff or completed setup exists. Choose one of 81 Turkish provinces and enter a district. No unit price, subscription or tier input is required. **Find online and apply** retrieves the latest currently effective EPDK table, validates column names, date and one matching residential row, then saves the tax-inclusive TRY/kWh estimate. No location or identifier is sent to EPDK. Skipping remains available. The UI deliberately has no manual unit-price entry.

The national residential price is not determined by city. The tier applies to total household consumption, not just the PC: up to 8 kWh/day is the lower tier; the portion above it uses the upper tier. Cortexia automatically uses the standard residential lower tier for a PC cost estimate and does not reconstruct a household bill or predict crossing the household threshold. Special contracts, SKTT, commercial and time-of-use subscriptions cannot be identified from city/district alone and cannot be inferred. The displayed amount is explicitly a standard-tariff estimate, not a verified rate for that household. The city/district are local preferences, not a price discriminator.

## Sources reviewed 2026-10-07

- [EPDK tariff tables](https://www.epdk.gov.tr/Detay/Icerik/3-1327/elektrik-faturalarina-esas-tarife-tablolari). The page's own public `POST /Detay/GetFastAccessList` with `fId=1327` returns document metadata; the current effective XLSX is downloaded from the same HTTPS origin. No script, macro or workbook external reference is executed.
- [GİB residential VAT base](https://gib.gov.tr/mevzuat/kanun/436/ozelge/32121): distribution and consumption tax are included in the VAT base. Its historical 8% rate must be read with the subsequent rate change.
- [GİB rate change](https://gib.gov.tr/mevzuat/kanun/436/ozelge/30157): the second-list VAT rate changed from 8% to 10% on 2023-07-10.
- [GİB consumption tax rate](https://gib.gov.tr/mevzuat/kanun/449/madde/8618): ordinary residential energy uses 5%, excluding distribution from that tax base.
- [Enerjisa residential tiers and SKTT](https://m.enerjisa.com.tr/tr/musteri-islemleri/tarifeler-ve-urunler/eviniz/ulusal-tarifeler/mesken-abone-grubu-ve-tarifeler).

Formula: `(energy + distribution + energy × 0.05) × 1.10`. Input workbook prices are kuruş/kWh and converted to TRY/kWh. Current verified table effective 2026-04-04 gives 3.238035 TRY/kWh for lower and 4.857048 TRY/kWh for upper tier; the runtime downloads the table rather than using these examples as fallback.

## Failure and maintenance behavior

HTTPS requests have 12-second timeouts, redirects disabled and 2 MB response limits. Unexpected headings, dates, rows or values stop application. Existing settings remain intact until the entire quote is valid. Tariff changes price future samples only. Saved source/date remain visible; a new online request refreshes them. There is no silent periodic price replacement.

The tax rules were reviewed for 2026 and automatic quoting rejects other calendar years until reviewed in a release. National tariff files alone do not establish every household's tax exemption or contract. Stable distribution needs ongoing source/tax review and wider subscription coverage. Test fixtures do not contact EPDK during CI; `--smoke --verify-tariff` exercises actual online lookup and persisted application locally.

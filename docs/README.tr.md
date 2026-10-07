# Cortexia Island

OLED siyah masaüstü adası. Ağ sağlığını, anlık trafiği ve PC enerji maliyetini takip eder. Ayarlardan widget ekleyip çıkarabilir ve sıralayabilirsin.

## Başlangıç

1. [Sürümlerden](https://github.com/GhostFelina/cortexia-island/releases) Windows x64 `.exe` paketini indir. Mac için arm64 (Apple Silicon) veya x64 (Intel) `.dmg` seç.
2. Ada ekranın üst ortasında açılır. Küçült düğmesiyle kapsüle dön; kapsüle tıklayarak genişlet.
3. Dişli düğmesinden faturandaki kWh fiyatını gir. Boşta/yoğun yük watt profilini cihazına göre ayarla.
4. Widget listesinden ağ, güç, enerji, sistem, batarya ve saati seç. Ok düğmesiyle sıralamayı değiştir.
5. **Ctrl/⌘ + Shift + I** gösterir/gizler. Sistem tepsisinden açabilir veya kapatabilirsin.
6. Başlıktaki marka alanını mouse ile tutup sürükle. Dört köşeden boyutlandır; her görünümün boyutu ayrı hatırlanır. “Üst ortaya geri getir” adayı ekranın üst kenarına birleştirir.
7. Saydamlık ve tıklama geçişini ayarlardan seç. Tam gizlemeden veya tıklama geçişinden tepsi/kısayolla geri dön. Açıkken Windows görev çubuğunda veya Mac Dock’ta uygulama ikonu görünür.

## Verileri doğru yorumlama

- İndirme/yükleme, adaptörden geçen gerçek anlık trafik miktarıdır. Speedtest sonucu değildir; yerel ağ trafiği dahil olabilir.
- Ping seçtiğin hedefe gönderilir. Yanıt kaybı doğrudan tüm internet bağlantısının kesildiği anlamına gelmez.
- “TAHMİN” güç değeri CPU yükünden ve ayarladığın profilden hesaplanır; prizden ölçülmez. Varsayılan 65–350 W senin bilgisayarının ölçümü değildir.
- Gerçek priz gücü için PC’yi ayrı bir Shelly Gen2/Gen3 ölçerli prize bağlayıp yerel IP’sini gir. İlk sürüm kimlik doğrulama gerektirmeyen tek kanal RPC okumasını destekler; prizi açıp kapatmaz.
- Tüketim yalnızca takip edilen saatleri kapsar. Uygulama kapalıyken, uykuda veya ölçüm yokken tüketim uydurulmaz.
- Tarife değişikliği sonraki örneklere uygulanır. Tarifesiz saatler ayrıca “fiyatlandırılmadı” olarak görünür. Bu rakam toplam elektrik faturası değildir.

## Yedek ve güncelleme

Veriler yerelde saklanır; son 14 otomatik yedek korunur. Ayarlardan JSON yedeği veya CSV alabilirsin. Geri yüklemede biçim kontrolü ve mevcut verilerin yedeği alınır. Birincil dosya bozulursa sağlam yerel yedek denenir.

Güncellemeyi ayarlardan arayabilir, kendin indirip kurabilirsin. İlk alfa paketleri imzasızdır. Windows imzası ve macOS notarizasyonu kararlı sürüm öncesi planlanmaktadır. Mac’te imzalı sürümlere geçilene kadar yeni paketleri Releases üzerinden kur; MacBook üzerinde gerçek cihaz doğrulaması henüz yapılmamıştır.

Kaynak kod, sürüm geçmişi, geliştirme komutları ve veri kısıtları için [ana README](../README.md).

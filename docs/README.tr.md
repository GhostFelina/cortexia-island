# Cortexia Island

OLED siyah masaüstü adası. Ana odak PC'nin elektrik tüketimi ve tahmini maliyetidir. Küçük görünümde bugünkü tutar, kWh ve anlık watt; geniş görünümde saatlik tahmin de gösterilir. Ağ sağlığı ikinci planda takip edilir. Ayarlardan widget ekleyip çıkarabilir ve sıralayabilirsin.

## Başlangıç

1. [Sürümlerden](https://github.com/GhostFelina/cortexia-island/releases) Windows x64 `.exe` paketini indir. Mac için arm64 (Apple Silicon) veya x64 (Intel) `.dmg` seç.
2. Ada ekranın üst ortasında ince kompakt çentik olarak açılır. Verilere tıklayarak genişlet; küçült düğmesiyle geri dön.
3. İlk açılışta şehir/semt, abonelik ve ev tüketimi kademesini seçip **Çevrimiçi bul ve uygula** düğmesine bas. Desteklenen ulusal mesken tek zamanlı tarifesi resmî EPDK tablosundan okunur; kaynağı, geçerlilik ve kontrol tarihi gösterilir. Şehir/semt cihazında kalır. SKTT/özel/ticari/çok zamanlı aboneliklerde faturandaki fiyatı gir. Boşta/yoğun yük watt profilini cihazına göre ayarla. Tarife yokken tutar uydurulmaz; saatlik rakam mevcut gücün bir saat sürmesi varsayımıdır.
4. Widget listesinden ağ, güç, enerji, sistem, batarya ve saati seç. Ok düğmesiyle sıralamayı değiştir.
5. **Ctrl/⌘ + Shift + I** gösterir/gizler. Sistem tepsisinden açabilir veya kapatabilirsin.
6. Başlıktaki marka alanını mouse ile tutup sürükle. Dört köşeden boyutlandır; her görünümün boyutu ayrı hatırlanır. “Üst ortaya geri getir” adayı ekranın üst kenarına birleştirir.
7. Saydamlık ve tıklama geçişini ayarlardan seç. Tam gizlemeden veya tıklama geçişinden tepsi/kısayolla geri dön. Açıkken Windows görev çubuğunda veya Mac Dock’ta uygulama ikonu görünür.
8. Marka/tutma alanından diğer monitöre sürükle; ekran tercihi seni bir monitöre kilitlemez. Her ekranda üst kenara yaklaşınca birleştirir; bu davranışı ayarlardaki kutudan kapatabilirsin. Kenardan ayrılınca yumuşak kapsüle dönüşür.

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

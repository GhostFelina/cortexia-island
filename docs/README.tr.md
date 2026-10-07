# Cortexia Island

OLED siyah masaüstü adası. Ana odak PC'nin elektrik tüketimi ve tahmini maliyetidir. Küçük görünümde bugünkü tutar, kWh ve anlık watt; geniş görünümde saatlik tahmin de gösterilir. Ağ sağlığı ikinci planda takip edilir. Ayarlardan widget ekleyip çıkarabilir ve sıralayabilirsin.

## Başlangıç

1. [Sürümlerden](https://github.com/GhostFelina/cortexia-island/releases) Windows x64 `.exe` paketini indir. Mac için arm64 (Apple Silicon) veya x64 (Intel) `.dmg` seç.
2. Ada ekranın üst ortasında ince kompakt çentik olarak açılır. Verilere tıklayarak genişlet; küçült düğmesiyle geri dön.
3. İlk açılışta yalnızca şehir ve ilçe girip **Tarifeyi otomatik bul ve uygula** düğmesine bas. Birim fiyat, abonelik veya kademe girmen gerekmez. Resmî EPDK ulusal mesken düşük kademe tarifesi otomatik okunur; kaynak ve tarihler gösterilir. Konum cihazında kalır. Ev sözleşmesi ve toplam tüketim bilinmediğinden bu rakam **standart tarife tahminidir**. Tarife yokken tutar uydurulmaz.
4. Widget listesinden ağ, güç, enerji, sistem, batarya, saat, elektrik sağlığı ve enerji içgörülerini seç. Ok düğmesiyle sıralamayı değiştir.
5. **Ctrl/⌘ + Shift + I** gösterir/gizler. Sistem tepsisinden açabilir veya kapatabilirsin.
6. Başlıktaki marka alanını mouse ile tutup sürükle. Dört köşeden boyutlandır; her görünümün boyutu ayrı hatırlanır. “Üst ortaya geri getir” adayı ekranın üst kenarına birleştirir.
7. Saydamlık ve tıklama geçişini ayarlardan seç. Tam gizlemeden veya tıklama geçişinden tepsi/kısayolla geri dön. Açıkken Windows görev çubuğunda veya Mac Dock’ta uygulama ikonu görünür.
8. Marka/tutma alanından diğer monitöre sürükle; ekran tercihi seni bir monitöre kilitlemez. Her ekranda üst kenara yaklaşınca birleştirir; bu davranışı ayarlardaki kutudan kapatabilirsin. Kenardan ayrılınca yumuşak kapsüle dönüşür.

9. Windows sol alt görev çubuğu bölgesindeki bağımsız canlı göstergede bir veya iki veri seç: tahmini tutar, kWh, watt, indirme, yükleme veya ping. Tıklayınca ada açılır; ayarlardan kapatılabilir. Windows hava durumu düğmesi değiştirilmez. Otomatik gizlenen veya altta olmayan görev çubuğunda bu gösterge görünmez.
10. Mac’te küçültülmüş görünüm varsayılan olarak damladır. Tıklayınca açılır; aşağı çekince esner, yeterince çekip bırakınca açılır. Küçük tutma alanıyla monitörler arasında taşı. Hareket azaltma ayarı desteklenir; gerçek MacBook testi sıradadır.

## Verileri doğru yorumlama

- İndirme/yükleme, adaptörden geçen gerçek anlık trafik miktarıdır. Speedtest sonucu değildir; yerel ağ trafiği dahil olabilir.
- Ping seçtiğin hedefe gönderilir. Yanıt kaybı doğrudan tüm internet bağlantısının kesildiği anlamına gelmez.
- “TAHMİN” güç değeri CPU yükünden ve ayarladığın profilden hesaplanır; prizden ölçülmez. Varsayılan 65–350 W senin bilgisayarının ölçümü değildir.
- Gerçek priz gücü için PC’yi ayrı bir Shelly Gen2/Gen3 ölçerli prize bağlayıp yerel IP’sini gir. İlk sürüm kimlik doğrulama gerektirmeyen tek kanal RPC okumasını destekler; prizi açıp kapatmaz.
- Tüketim yalnızca takip edilen saatleri kapsar. Uygulama kapalıyken, uykuda veya ölçüm yokken tüketim uydurulmaz.
- Elektrik sağlığı yalnızca uyumlu ölçerin ilettiği voltaj, akım, frekans, kendi sıcaklığı, güç faktörü ve koruma bildirimlerini gösterir. Eksik değerler boş kalır; şebeke/PSU güvenlik teşhisi yapılmaz. Enerji içgörüleri, takip edilen ortalama ve sabit güç varsayımıyla 100 saatlik projeksiyon sunar.
- Tarife değişikliği sonraki örneklere uygulanır. Tarifesiz saatler ayrıca “fiyatlandırılmadı” olarak görünür. Bu rakam toplam elektrik faturası değildir.

## Yedek ve güncelleme

Veriler yerelde saklanır; son 14 otomatik yedek korunur. Ayarlardan JSON yedeği veya CSV alabilirsin. Geri yüklemede biçim kontrolü ve mevcut verilerin yedeği alınır. Birincil dosya bozulursa sağlam yerel yedek denenir.

Güncellemeyi ayarlardan arayabilir, kendin indirip kurabilirsin. İlk alfa paketleri imzasızdır. Windows imzası ve macOS notarizasyonu kararlı sürüm öncesi planlanmaktadır. Mac’te imzalı sürümlere geçilene kadar yeni paketleri Releases üzerinden kur; MacBook üzerinde gerçek cihaz doğrulaması henüz yapılmamıştır.

Kaynak kod, sürüm geçmişi, geliştirme komutları ve veri kısıtları için [ana README](../README.md).

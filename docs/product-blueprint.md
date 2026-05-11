# Product Blueprint

## Product Goal

Emlak danismanlari icin yeni ilanlari filtreye gore anlik yakalayan, kullanicinin kendi paneline ve mobil uygulamasina canli dusuren, sonradan grup ve premium otomasyonlarla genisleyen operasyon platformu.

## Non-Negotiables

- Veri kaynagi ilk asamada `Sahibinden`
- Hedef algilama suresi `1-5 saniye`, kabul edilebilir ust sinir `30 saniye`
- `Web + iOS + Android` ayni urunun parcalari olacak
- Kullanici sahipligi `kisi bazli`
- Her eslesme `anlik` kullaniciya gorunmeli
- Ilan tek kayit tutulacak, hangi botlarla eslestigi ayrica tutulacak
- Grup mantigi kullanici istegine bagli katman olacak
- 8 haneli sadece rakamlardan olusan benzersiz `userId` uretilecek

## User Model

Ana aktor `danisman`.

Danisman:

- Kendi hesabina sahip olur
- Kendi botlarini olusturur
- Tum eslesen ilanlari kendi akisinda gorur
- Isterse grup kurar veya gruba katilir
- Grup davetini kullanici ID ile yapar

## Core Modules

### 1. Authentication and Identity

- e-posta / sifre ile kayit ve giris
- 8 haneli numeric kullanici ID
- cihaz oturum yonetimi
- profil ve guvenlik ayarlari

### 2. Bot Builder

- il / ilce / mahalle
- fiyat araligi
- oda sayisi
- m2 araligi
- bina yasi
- kat bilgisi
- konut tipi
- ilan tipi
- esya durumu
- krediye uygunluk
- anahtar kelime dahil / haric
- oncelik seviyesi
- kayitli filtre setleri

### 3. Listing Ingestion

- yeni ilan algilama
- normalize etme
- duplicate ayiklama
- guncelleme / fiyat degisimi yakalama
- medya URL ve kritik snapshot bilgilerini saklama

### 4. Matching and Delivery

- yeni listing -> bot eslestirme
- `listing_matches` uzerinden coklu eslesme
- websocket ile web + mobil canli dagitim
- sonraki fazda push notification destegi

### 5. Live Feed

- tek akista tum eslesen ilanlar
- ustten bot / durum / etiket filtreleme
- yeni / guncellendi / fiyat dustu rozetleri
- sayfa yenilemeden akisin surmesi

### 6. Listing Detail and Workflow

- ilanin tum mevcut alanlari
- medyalar
- konum
- fiyat gecmisi
- eslesen botlar
- notlar
- durumlar
- favori

### 7. Groups

- grup olusturma
- ID ile kullanici ekleme
- manuel paylasim ve grup gorunumu
- grup ici not / etiket
- kurucu / yonetici / uye rolleri

### 8. Premium Feature Packs

Teknik olarak ilk gunden sistemde moduler olacak, kullanici isterse aktif edecek:

- `AI Pack`: akilli oncelik, ozet, benzer ilan, akilli eslestirme
- `Automation Pack`: otomatik mesaj, etiketleme, kurala bagli aksiyon
- `Insights Pack`: dashboard, trend, performans analizleri
- `Valuation Pack`: fiyat tahmini ve piyasa karsilastirma

## Data Model Principles

- `listings` tek kaynak tablo olur
- `listing_matches` kullanici + bot baglanti katmani olur
- kullanici ayni ilani kendi akisinda tek kayit olarak gorur
- detayda eslesen butun botlar listelenir
- `user_listing_states` ile kullaniciya ozel favori, not, durum tutulur

## Platform Architecture

- `apps/api`: auth, bots, listings, matching, groups, notifications
- `apps/web`: veri yogun ama sade operasyon paneli
- `apps/mobile`: hizli aksiyon odakli mobil deneyim
- `Redis/BullMQ`: ingestion, matching, bildirim isleri
- `Socket.IO`: canli olay dagitimi

## Release Strategy

### Phase 0

Teknik dogrulama:

- veri erisim yontemi
- ortalama gecikme
- duplicate mantigi
- captcha / anti-bot davranisi
- yasal ve operasyonel risk notlari

### Phase 1

MVP cekirdek:

- auth
- bot olusturma
- listing ingest
- matching
- canli feed
- listing detail
- not / durum / favori

### Phase 2

- grup sistemi
- app kapaliyken push bildirim
- daha gelismis feed kontrolleri

### Phase 3

- premium paket aktivasyonu
- AI / otomasyon / analiz modulleri

# Phase 0 Validation Plan

Bu fazin amaci, urunun en riskli bolumu olan veri toplama ve anlik dagitim zincirini dogrulamak.

## Basari Kriterleri

- Yeni ilan yakalama gecikmesi olculecek
- `1-5 saniye` hedefinin gercekci olup olmadigi gorulecek
- Olmazsa `30 saniye` fallback stratejisi netlesecek
- Duplicate ve update tespiti test edilecek
- WebSocket ile canli dagitim akisi ispatlanacak

## Cevaplanacak Sorular

1. Sahibinden verisi teknik olarak hangi yontemle alinacak?
2. En dusuk guvenilir polling araligi ne olacak?
3. Anti-bot / captcha / rate limit davranisi ne kadar agresif?
4. Ayni ilanin yeniden yayinlanmasi ile guncellenmesi nasil ayristirilacak?
5. Ilan detayinda hangi alanlar her zaman, hangileri opsiyonel gelecek?

## Deney Plani

### 1. Source Adapter Spike

- yeni ilan listeleme akisina erisen deneysel adapter yaz
- normalized output uret
- alan kapsamini belgeye dok

### 2. Polling Benchmark

- 5s, 10s, 15s, 30s araliklarinda test et
- basari orani, timeout, hata tipi ve olasi engellenme durumlarini kaydet

### 3. Listing Identity Strategy

- kaynak ilan ID
- canonical URL
- baslik + fiyat + konum hash
- medya hash / fingerprint

### 4. Realtime Simulation

- ornek listing event'i uret
- websocket odalarina kullanici bazli dagit
- reconnect ve missed event davranisini tanimla

### 5. Legal / Operational Notes

- kullanim kosullari incelemesi
- operasyonel riskler
- proxy/IP stratejisi gerekip gerekmedigi

## Faz 0 Ciktilari

- source adapter teknik notu
- normalized listing schema v1
- ingestion gecikme raporu
- risk matrisi
- Faz 1 backlog'u

# Webico EMLAK

Sahibinden odakli, gercek zamanli emlak operasyon platformu.

Bu repo ilk mimari iskeleti ve urun blueprint'i ile baslatildi. Hedef mimari:

- `apps/web`: Next.js operasyon paneli
- `apps/mobile`: Expo / React Native mobil uygulama
- `apps/api`: NestJS backend ve websocket katmani
- `docs/`: urun, mimari ve Faz 0 teknik dogrulama dokumanlari

## Oncelikler

- Filtreye gore yeni ilanlari hizli ve dogru yakalama
- Tek kayit, coklu filtre eslesmesi modeli
- Web ve mobilde anlik veri akisi
- Kullanici bazli sahiplik, grup bazli paylasim
- Sonradan acilip kapatilabilen premium moduller

## Ilk Teknik Yapi

- Web: `Next.js`
- Mobile: `Expo + React Native`
- API: `NestJS`
- Database: `PostgreSQL`
- Queue/Cache: `Redis + BullMQ`
- Realtime: `Socket.IO`
- Infra: `AWS EC2 + RDS + ElastiCache + S3`

## Sonraki Adimlar

1. `docs/phase-0-validation.md` icindeki teknik dogrulama islerini tamamlamak
2. Workspace bagimliliklarini kurmak
3. Auth, listings, bots ve realtime modullerini backend'de olusturmak
4. Web panel ve mobil uygulamada ortak domain modelini kullanmak

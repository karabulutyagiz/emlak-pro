import { BadGatewayException, Injectable } from '@nestjs/common';
import { load } from 'cheerio';
import { chromium } from 'playwright-core';
import { CreateListingDto } from '../listings/create-listing.dto';
import { SahibindenRawListingDto } from './dto/sahibinden-raw-listing.dto';

type ParsedResult = {
  sourceUrl: string;
  listings: SahibindenRawListingDto[];
  blocked: boolean;
};

@Injectable()
export class SahibindenAdapterService {
  private readonly baseUrl = 'https://www.sahibinden.com';

  normalize(raw: SahibindenRawListingDto): CreateListingDto {
    return {
      source: 'sahibinden',
      sourceListingId: raw.id,
      title: raw.title.trim(),
      canonicalUrl: raw.url,
      city: raw.city?.trim(),
      district: raw.district?.trim(),
      neighborhood: raw.neighborhood?.trim(),
      price: raw.price,
      currency: raw.currency?.trim() ?? 'TRY',
      roomCount: raw.roomCount?.trim(),
      grossAreaM2: raw.grossAreaM2,
      description: raw.description?.trim(),
      primaryImageUrl: raw.primaryImageUrl,
      mediaUrls: raw.imageUrls ?? [],
    };
  }

  samplePayload(): SahibindenRawListingDto {
    return {
      id: '1234567890',
      title: 'Kadıköy 2+1 Sahibinden Kiralık Daire',
      url: 'https://www.sahibinden.com/ilan/emlak-konut-kiralik-kadikoy-2-1-ornek-1234567890/detay',
      city: 'İstanbul',
      district: 'Kadıköy',
      neighborhood: 'Feneryolu',
      price: 39500,
      currency: 'TRY',
      roomCount: '2+1',
      grossAreaM2: 95,
      description: 'Yeni girilen örnek ilan verisi.',
      primaryImageUrl: 'https://example.com/listing/primary.jpg',
      imageUrls: ['https://example.com/listing/primary.jpg'],
    };
  }

  async fetchLatest(searchPath: string): Promise<ParsedResult> {
    const normalizedPath = searchPath.startsWith('/') ? searchPath : `/${searchPath}`;
    const sourceUrl = `${this.baseUrl}${normalizedPath}`;

    const response = await fetch(sourceUrl, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'accept-language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        ...(process.env.SAHIBINDEN_COOKIE ? { cookie: process.env.SAHIBINDEN_COOKIE } : {}),
      },
      redirect: 'follow',
    });

    const html = await response.text();
    const blocked = response.status === 403 || html.includes('cf-mitigated') || html.includes('Just a moment...');

    if (blocked) {
      return {
        sourceUrl,
        blocked: true,
        listings: [],
      };
    }

    return {
      sourceUrl,
      blocked: false,
      listings: this.parseListings(html),
    };
  }

  async fetchLatestWithBrowser(searchPath: string): Promise<ParsedResult> {
    const normalizedPath = searchPath.startsWith('/') ? searchPath : `/${searchPath}`;
    const sourceUrl = `${this.baseUrl}${normalizedPath}`;
    const executablePath = process.env.BRAVE_EXECUTABLE_PATH;

    if (!executablePath) {
      throw new BadGatewayException('BRAVE_EXECUTABLE_PATH tanımlı değil.');
    }

    const browser = await chromium.launch({
      executablePath,
      headless: true,
    });

    try {
      const context = await browser.newContext({
        locale: 'tr-TR',
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
      });

      if (process.env.SAHIBINDEN_COOKIE) {
        const cookies = process.env.SAHIBINDEN_COOKIE.split(';')
          .map((item) => item.trim())
          .filter(Boolean)
          .map((item) => {
            const separatorIndex = item.indexOf('=');
            return {
              name: item.slice(0, separatorIndex),
              value: item.slice(separatorIndex + 1),
              domain: '.sahibinden.com',
              path: '/',
            };
          });

        await context.addCookies(cookies);
      }

      const page = await context.newPage();
      await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForTimeout(5000);
      const html = await page.content();

      const blocked = html.includes('cf-mitigated') || html.includes('Just a moment...');

      await context.close();

      return {
        sourceUrl,
        blocked,
        listings: blocked ? [] : this.parseListings(html),
      };
    } finally {
      await browser.close();
    }
  }

  ensureNotBlocked(result: ParsedResult) {
    if (result.blocked) {
      throw new BadGatewayException(
        'Sahibinden isteği Cloudflare korumasına takıldı. Geçerli tarayıcı çerezi olmadan bu makineden doğrudan çekim yapılamıyor.',
      );
    }
  }

  private parseListings(html: string): SahibindenRawListingDto[] {
    const $ = load(html);
    const parsed = new Map<string, SahibindenRawListingDto>();

    $('a[href*="/ilan/"]').each((_, element) => {
      const anchor = $(element);
      const href = anchor.attr('href');
      const title = anchor.attr('title')?.trim() || anchor.text().trim();

      if (!href || !title) {
        return;
      }

      const idMatch = href.match(/-(\d+)\/detay$/);
      const listingId = idMatch?.[1];

      if (!listingId || parsed.has(listingId)) {
        return;
      }

      const cardText = anchor.closest('tr, li, article, .searchResultsItem, .classifiedBox').text().replace(/\s+/g, ' ').trim();
      const priceMatch = cardText.match(/([\d\.]+)\s*TL/);
      const roomMatch = cardText.match(/(\d\+\d)/);
      const imageUrl = anchor.find('img').attr('src') || anchor.find('img').attr('data-src');

      parsed.set(listingId, {
        id: listingId,
        title,
        url: href.startsWith('http') ? href : `${this.baseUrl}${href}`,
        city: this.extractCity(cardText),
        district: this.extractDistrict(cardText),
        neighborhood: this.extractNeighborhood(cardText),
        price: priceMatch ? Number(priceMatch[1].replace(/\./g, '')) : undefined,
        currency: 'TRY',
        roomCount: roomMatch?.[1],
        grossAreaM2: this.extractSquareMeters(cardText),
        description: cardText || undefined,
        primaryImageUrl: imageUrl,
        imageUrls: imageUrl ? [imageUrl] : [],
      });
    });

    return Array.from(parsed.values()).slice(0, 25);
  }

  private extractSquareMeters(text: string) {
    const match = text.match(/(\d{2,4})\s*m²/i);
    return match ? Number(match[1]) : undefined;
  }

  private extractCity(text: string) {
    const parts = text.split('/').map((part) => part.trim()).filter(Boolean);
    return parts[0] || undefined;
  }

  private extractDistrict(text: string) {
    const parts = text.split('/').map((part) => part.trim()).filter(Boolean);
    return parts[1] || undefined;
  }

  private extractNeighborhood(text: string) {
    const parts = text.split('/').map((part) => part.trim()).filter(Boolean);
    return parts[2] || undefined;
  }
}

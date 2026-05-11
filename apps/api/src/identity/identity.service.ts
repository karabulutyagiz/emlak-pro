import { Injectable } from '@nestjs/common';

@Injectable()
export class IdentityService {
  generatePublicUserId() {
    const min = 10_000_000;
    const max = 99_999_999;

    return String(Math.floor(Math.random() * (max - min + 1)) + min);
  }

  previewBatch(size = 5) {
    return Array.from({ length: size }, () => this.generatePublicUserId());
  }
}

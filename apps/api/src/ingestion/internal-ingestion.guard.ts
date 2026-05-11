import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class InternalIngestionGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-ingestion-token'];
    const expected = process.env.INGESTION_TOKEN;

    if (!expected || typeof token !== 'string' || token !== expected) {
      throw new UnauthorizedException('Gecersiz ingestion token.');
    }

    return true;
  }
}

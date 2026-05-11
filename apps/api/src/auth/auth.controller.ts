import { Body, Controller, Get, Headers, Post, Query, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { AuthenticatedUser } from './authenticated-user.type';
import { LoginDto } from './dto/login.dto';
import { CompletePasswordSetupDto } from './dto/complete-password-setup.dto';
import { SessionAuthGuard } from './session-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Headers('user-agent') userAgent?: string) {
    return {
      data: await this.authService.login(dto, userAgent),
    };
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return {
      data: await this.authService.getProfile(user.id),
    };
  }

  @Get('setup-password/validate')
  async validatePasswordSetupToken(@Query('token') token?: string) {
    return {
      data: await this.authService.validatePasswordSetupToken(token),
    };
  }

  @Post('setup-password/complete')
  async completePasswordSetup(@Body() dto: CompletePasswordSetupDto) {
    return {
      data: await this.authService.completePasswordSetup(dto),
    };
  }
}

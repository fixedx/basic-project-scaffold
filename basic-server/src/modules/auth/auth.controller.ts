import { Controller, Get } from '@nestjs/common';

@Controller()
export class AuthController {
  @Get('auth/test')
  test() {
    return { message: 'Auth module is working' };
  }
}
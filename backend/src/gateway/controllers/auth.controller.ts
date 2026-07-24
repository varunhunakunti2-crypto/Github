import { Controller, Post, Get, Body, Param } from "@nestjs/common";
import { AuthService } from "../../services/auth/auth.service";
import { SignupDto } from "../dto/auth/signup.dto";
import { LoginDto } from "../dto/auth/login.dto";

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signup")
  signup(@Body() dto: SignupDto) { return this.authService.signup(dto); }

  @Post("login")
  login(@Body() dto: LoginDto) { return this.authService.login(dto); }

  @Post("logout")
  logout() { return this.authService.logout(); }

  @Post("auth/refresh")
  refresh() { return this.authService.refreshToken(); }

  @Post("auth/verify-email")
  verifyEmail() { return this.authService.verifyEmail(); }

  @Post("auth/forgot-password")
  forgotPassword() { return this.authService.forgotPassword(); }

  @Post("auth/reset-password")
  resetPassword() { return this.authService.resetPassword(); }

  @Post("auth/2fa/enable")
  enable2fa() { return this.authService.enable2fa(); }

  @Post("auth/2fa/verify")
  verify2fa() { return this.authService.verify2fa(); }

  @Post("auth/2fa/challenge")
  challenge2fa() { return this.authService.challenge2fa(); }

  @Get("auth/oauth/:provider")
  oauthRedirect(@Param("provider") provider: string) { return this.authService.oauthRedirect(provider); }

  @Get("auth/oauth/:provider/callback")
  oauthCallback(@Param("provider") provider: string) { return this.authService.oauthCallback(provider); }
}

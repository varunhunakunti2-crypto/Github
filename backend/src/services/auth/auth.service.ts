import { Injectable } from "@nestjs/common";

@Injectable()
export class AuthService {
  async signup(dto: any) { return { message: "signup" }; }
  async login(dto: any) { return { message: "login" }; }
  async logout() { return { message: "logout" }; }
  async refreshToken() { return { message: "refresh" }; }
  async verifyEmail() { return { message: "verify-email" }; }
  async forgotPassword() { return { message: "forgot-password" }; }
  async resetPassword() { return { message: "reset-password" }; }
  async enable2fa() { return { message: "2fa-enable" }; }
  async verify2fa() { return { message: "2fa-verify" }; }
  async challenge2fa() { return { message: "2fa-challenge" }; }
  async oauthRedirect(provider: string) { return { message: "oauth-redirect", provider }; }
  async oauthCallback(provider: string) { return { message: "oauth-callback", provider }; }
}

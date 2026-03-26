import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { UsersService } from '../users/users.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const FORGOT_PASSWORD_RESPONSE = {
  message: 'If your email exists, a reset link has been sent.',
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const created = await this.usersService.create({
      email,
      password: dto.password,
      fullName: dto.fullName,
    });

    return {
      id: String(created._id),
      email: created.email,
      fullName: created.fullName,
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(email, true);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const access_token = await this.jwtService.signAsync({
      sub: String(user._id),
      email: user.email,
    });

    return {
      access_token,
      token_type: 'Bearer',
      user: {
        id: String(user._id),
        email: user.email,
        fullName: user.fullName,
      },
    };
  }

  async profile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return {
      id: String(user._id),
      email: user.email,
      fullName: user.fullName,
      createdAt:
        user.createdAt != null ? new Date(user.createdAt).toISOString() : undefined,
    };
  }

  /**
   * Does not reveal whether the email is registered (timing-safe UX).
   * Stores SHA-256 of a random token; plain token is only logged in development when configured.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<typeof FORGOT_PASSWORD_RESPONSE> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(email);

    if (user) {
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const minutes = Number(
        this.configService.get<string>('PASSWORD_RESET_EXPIRES_MIN', '60'),
      );
      const expiresMs = Number.isFinite(minutes) && minutes > 0 ? minutes * 60_000 : 60 * 60_000;
      const expiresAt = new Date(Date.now() + expiresMs);

      await this.usersService.setPasswordResetToken(email, tokenHash, expiresAt);

      const frontendUrl = this.configService.get<string>('FRONTEND_URL', '').replace(/\/$/, '');
      const logResetInDev =
        this.configService.get<string>('NODE_ENV', 'development') !== 'production' &&
        this.configService.get<string>('PASSWORD_RESET_LOG_LINK', 'false') === 'true';

      if (logResetInDev && frontendUrl) {
        const link = `${frontendUrl}/auth/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;
        this.logger.warn(`[DEV] Password reset link for ${email}: ${link}`);
      } else if (logResetInDev) {
        this.logger.warn(
          `[DEV] Set FRONTEND_URL in .env to log full reset URL. Token issued for ${email} (not printed).`,
        );
      }
    }

    return FORGOT_PASSWORD_RESPONSE;
  }

  /**
   * Validates reset token (SHA-256) and expiry, then sets new password (bcrypt via User pre-save).
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.usersService.findForPasswordReset(email);

    if (
      !user ||
      !user.passwordResetTokenHash ||
      !user.passwordResetExpires
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (user.passwordResetExpires.getTime() < Date.now()) {
      await this.usersService.clearPasswordResetToken(email);
      throw new BadRequestException('Invalid or expired reset token');
    }

    const submittedHash = createHash('sha256').update(dto.token).digest('hex');
    if (!this.timingSafeEqualHex(submittedHash, user.passwordResetTokenHash)) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    user.password = dto.password;
    await user.save();
    await this.usersService.clearPasswordResetToken(email);

    return { message: 'Password has been reset successfully' };
  }

  private timingSafeEqualHex(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    try {
      const bufA = Buffer.from(a, 'hex');
      const bufB = Buffer.from(b, 'hex');
      if (bufA.length !== bufB.length) return false;
      return timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }
}

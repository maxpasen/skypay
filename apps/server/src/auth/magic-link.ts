import crypto from 'crypto';
import { nanoid } from 'nanoid';
import nodemailer from 'nodemailer';
import { prisma } from '../lib/db.js';
import { config, isDev } from '../lib/config.js';
import { logger } from '../lib/logger.js';

export class MagicLinkService {
  private transporter: nodemailer.Transporter | null;

  constructor() {
    // Only create transporter if SMTP is configured
    if (config.smtp.dsn) {
      this.transporter = nodemailer.createTransport(config.smtp.dsn);
    } else {
      this.transporter = null;
      logger.info('SMTP not configured, magic links will be logged to console');
    }
  }

  /**
   * Send a magic link to the user's email
   */
  async sendMagicLink(email: string): Promise<void> {
    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Generate a display name from email
      const displayName = email.split('@')[0];

      user = await prisma.user.create({
        data: {
          email,
          displayName,
        },
      });

      logger.info({ userId: user.id, email }, 'New user created');
    }

    // Generate token
    const token = nanoid(32);
    const tokenHash = this.hashToken(token);

    // Store token in database
    await prisma.magicLinkToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    });

    // Build magic link URL
    const callbackUrl = `${config.appOrigin}/auth/callback?token=${token}`;

    // Send email or log
    if (this.transporter && !isDev) {
      await this.transporter.sendMail({
        from: '"SkiPay" <noreply@skipay.app>',
        to: email,
        subject: 'Your SkiPay Login Link',
        text: `Click here to log in: ${callbackUrl}`,
        html: `
          <h2>Welcome to SkiPay!</h2>
          <p>Click the link below to log in:</p>
          <a href="${callbackUrl}">Log In</a>
          <p>This link expires in 15 minutes.</p>
        `,
      });

      logger.info({ email }, 'Magic link email sent');
    } else {
      // Dev mode: log to console
      logger.info({ email, callbackUrl }, '🔗 MAGIC LINK (DEV MODE)');
      console.log('\n========================================');
      console.log('🔗 MAGIC LINK FOR:', email);
      console.log('========================================');
      console.log(callbackUrl);
      console.log('========================================\n');
    }
  }

  /**
   * Verify a magic link token and return user
   */
  async verifyToken(token: string): Promise<{ userId: string; email: string } | null> {
    const tokenHash = this.hashToken(token);

    // Find token
    const magicLink = await prisma.magicLinkToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!magicLink) {
      return null;
    }

    // Check if expired
    if (magicLink.expiresAt < new Date()) {
      return null;
    }

    // Check if already used
    if (magicLink.usedAt) {
      return null;
    }

    // Mark as used
    await prisma.magicLinkToken.update({
      where: { id: magicLink.id },
      data: { usedAt: new Date() },
    });

    return {
      userId: magicLink.user.id,
      email: magicLink.user.email,
    };
  }

  /**
   * Hash a token
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Clean up expired tokens (call periodically)
   */
  async cleanupExpiredTokens(): Promise<void> {
    await prisma.magicLinkToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }
}

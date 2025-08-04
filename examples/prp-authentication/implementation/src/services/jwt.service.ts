import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Redis } from 'ioredis';

interface TokenPayload {
  sub: string;
  type: 'access' | 'refresh';
  sessionId: string;
  iat: number;
  exp?: number;
  scope?: string[];
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

interface JWTConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
}

/**
 * JWT Service implementing the PRP authentication patterns
 * Follows the dual-token approach with short-lived access tokens
 * and long-lived refresh tokens as defined in the PRP template
 */
export class JWTService {
  private redis: Redis;
  private config: JWTConfig;
  private blacklistKeyPrefix = 'blacklist:token:';
  
  constructor(redis: Redis, config: JWTConfig) {
    this.redis = redis;
    this.config = config;
  }

  /**
   * Generate a token pair following PRP pattern
   * - Access token: 15 minutes
   * - Refresh token: 7 days
   */
  async generateTokenPair(userId: string, sessionId: string, scope: string[] = []): Promise<TokenPair> {
    // Generate access token
    const accessToken = jwt.sign(
      {
        sub: userId,
        type: 'access',
        sessionId,
        scope,
        iat: Math.floor(Date.now() / 1000)
      } as TokenPayload,
      this.config.accessTokenSecret,
      { expiresIn: this.config.accessTokenExpiry }
    );

    // Generate refresh token with different secret
    const refreshToken = jwt.sign(
      {
        sub: userId,
        type: 'refresh',
        sessionId,
        iat: Math.floor(Date.now() / 1000)
      } as TokenPayload,
      this.config.refreshTokenSecret,
      { expiresIn: this.config.refreshTokenExpiry }
    );

    // Store refresh token hash in Redis for tracking
    const refreshTokenHash = this.hashToken(refreshToken);
    await this.redis.setex(
      `refresh:${userId}:${refreshTokenHash}`,
      7 * 24 * 60 * 60, // 7 days in seconds
      JSON.stringify({ sessionId, createdAt: Date.now() })
    );

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900 // 15 minutes in seconds
    };
  }

  /**
   * Verify and decode access token
   */
  async verifyAccessToken(token: string): Promise<TokenPayload> {
    // Check if token is blacklisted
    const isBlacklisted = await this.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new Error('Token has been revoked');
    }

    try {
      const payload = jwt.verify(token, this.config.accessTokenSecret) as TokenPayload;
      
      if (payload.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Verify and decode refresh token
   */
  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      const payload = jwt.verify(token, this.config.refreshTokenSecret) as TokenPayload;
      
      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if refresh token exists in Redis
      const tokenHash = this.hashToken(token);
      const exists = await this.redis.exists(`refresh:${payload.sub}:${tokenHash}`);
      
      if (!exists) {
        throw new Error('Refresh token not found or expired');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * Implements token rotation for enhanced security
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    const payload = await this.verifyRefreshToken(refreshToken);
    
    // Delete old refresh token (rotation)
    const oldTokenHash = this.hashToken(refreshToken);
    await this.redis.del(`refresh:${payload.sub}:${oldTokenHash}`);
    
    // Generate new token pair
    return this.generateTokenPair(payload.sub, payload.sessionId, payload.scope);
  }

  /**
   * Revoke tokens by adding to blacklist
   * Used during logout or security events
   */
  async revokeToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as TokenPayload;
      if (!decoded || !decoded.exp) return;

      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        const tokenHash = this.hashToken(token);
        await this.redis.setex(
          `${this.blacklistKeyPrefix}${tokenHash}`,
          ttl,
          '1'
        );
      }
    } catch (error) {
      // Token might be invalid, but we still want to blacklist it
      const tokenHash = this.hashToken(token);
      await this.redis.setex(
        `${this.blacklistKeyPrefix}${tokenHash}`,
        86400, // 24 hours default
        '1'
      );
    }
  }

  /**
   * Revoke all tokens for a user
   * Used when user changes password or during security events
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    // Find all refresh tokens for user
    const pattern = `refresh:${userId}:*`;
    const keys = await this.redis.keys(pattern);
    
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    
    // Add user to revocation list with timestamp
    await this.redis.set(
      `revoked:user:${userId}`,
      Date.now().toString(),
      'EX',
      7 * 24 * 60 * 60 // Keep for 7 days
    );
  }

  /**
   * Check if a token is blacklisted
   */
  private async isTokenBlacklisted(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    const exists = await this.redis.exists(`${this.blacklistKeyPrefix}${tokenHash}`);
    
    // Also check if user's tokens are all revoked
    try {
      const decoded = jwt.decode(token) as TokenPayload;
      if (decoded && decoded.sub) {
        const userRevoked = await this.redis.get(`revoked:user:${decoded.sub}`);
        if (userRevoked) {
          const revokedAt = parseInt(userRevoked);
          const tokenIat = decoded.iat * 1000; // Convert to milliseconds
          return tokenIat < revokedAt;
        }
      }
    } catch {
      // Invalid token, consider it blacklisted
      return true;
    }
    
    return exists === 1;
  }

  /**
   * Hash token for storage (security best practice)
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch {
      return null;
    }
  }
}
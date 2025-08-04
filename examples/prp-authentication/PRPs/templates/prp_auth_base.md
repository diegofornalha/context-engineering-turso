# Authentication System PRP Template

## Context
Building a production-ready authentication system that handles:
- JWT-based stateless authentication
- OAuth2 social login integration
- Session management with Redis
- Two-factor authentication (2FA)
- Advanced security features

## Pattern Recognition

### 1. Token Management Pattern
**Problem**: Managing stateless authentication with security
**Solution**: Dual-token approach with short-lived access tokens and long-lived refresh tokens

```typescript
interface TokenPair {
  accessToken: string;  // 15 minutes expiry
  refreshToken: string; // 7 days expiry
  tokenType: 'Bearer';
  expiresIn: number;
}

// Token generation pattern
class JWTService {
  generateTokenPair(userId: string, sessionId: string): TokenPair {
    const accessToken = jwt.sign(
      { 
        sub: userId, 
        type: 'access',
        sessionId,
        iat: Date.now() 
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
      { 
        sub: userId, 
        type: 'refresh',
        sessionId,
        iat: Date.now()
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    
    return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: 900 };
  }
}
```

### 2. OAuth Integration Pattern
**Problem**: Integrating multiple OAuth providers seamlessly
**Solution**: Strategy pattern with Passport.js

```typescript
interface OAuthProfile {
  provider: 'google' | 'github' | 'facebook';
  providerId: string;
  email: string;
  name: string;
  avatar?: string;
}

// Provider-agnostic OAuth handler
class OAuthService {
  async handleOAuthCallback(profile: OAuthProfile): Promise<User> {
    // Check if user exists
    let user = await User.findByEmail(profile.email);
    
    if (!user) {
      // Create new user
      user = await User.create({
        email: profile.email,
        name: profile.name,
        avatar: profile.avatar,
        providers: [{
          name: profile.provider,
          providerId: profile.providerId
        }]
      });
    } else {
      // Link provider if not already linked
      await user.linkProvider(profile.provider, profile.providerId);
    }
    
    return user;
  }
}
```

### 3. Security Middleware Pattern
**Problem**: Implementing defense-in-depth security
**Solution**: Layered middleware approach

```typescript
// Security middleware stack
const securityStack = [
  helmet(), // Security headers
  cors(corsOptions), // CORS protection
  rateLimit({ // Rate limiting
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests'
  }),
  validateInput(), // Input sanitization
  checkBlacklist(), // Token blacklist
  verifyJWT(), // JWT validation
  checkPermissions() // Authorization
];
```

### 4. Session Management Pattern
**Problem**: Managing distributed sessions at scale
**Solution**: Redis-backed session store with TTL

```typescript
class SessionManager {
  private redis: Redis;
  
  async createSession(userId: string, metadata: SessionMetadata): Promise<string> {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const session = {
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      ...metadata
    };
    
    await this.redis.setex(
      `session:${sessionId}`,
      3600 * 24 * 7, // 7 days
      JSON.stringify(session)
    );
    
    return sessionId;
  }
  
  async validateSession(sessionId: string): Promise<boolean> {
    const session = await this.redis.get(`session:${sessionId}`);
    if (!session) return false;
    
    // Update last activity
    const data = JSON.parse(session);
    data.lastActivity = Date.now();
    await this.redis.setex(
      `session:${sessionId}`,
      3600 * 24 * 7,
      JSON.stringify(data)
    );
    
    return true;
  }
}
```

### 5. Password Security Pattern
**Problem**: Secure password storage and validation
**Solution**: bcrypt with adaptive rounds

```typescript
class PasswordService {
  private readonly MIN_ROUNDS = 12;
  
  async hashPassword(password: string): Promise<string> {
    // Validate password strength
    this.validatePasswordStrength(password);
    
    // Hash with bcrypt
    const salt = await bcrypt.genSalt(this.MIN_ROUNDS);
    return bcrypt.hash(password, salt);
  }
  
  private validatePasswordStrength(password: string): void {
    const requirements = [
      { regex: /.{8,}/, message: 'At least 8 characters' },
      { regex: /[A-Z]/, message: 'At least one uppercase letter' },
      { regex: /[a-z]/, message: 'At least one lowercase letter' },
      { regex: /[0-9]/, message: 'At least one number' },
      { regex: /[^A-Za-z0-9]/, message: 'At least one special character' }
    ];
    
    for (const req of requirements) {
      if (!req.regex.test(password)) {
        throw new ValidationError(req.message);
      }
    }
  }
}
```

## Implementation Guidelines

### Database Schema
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  avatar_url VARCHAR(500),
  email_verified BOOLEAN DEFAULT false,
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OAuth providers
CREATE TABLE oauth_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_id)
);

-- Refresh tokens (for tracking/revocation)
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Error Handling Pattern
```typescript
class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// Usage
throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS', 401);
throw new AuthError('Token expired', 'TOKEN_EXPIRED', 401);
throw new AuthError('Account locked', 'ACCOUNT_LOCKED', 403);
```

## Security Checklist

- [ ] **Password Security**
  - [ ] Minimum 12 rounds bcrypt
  - [ ] Password strength validation
  - [ ] Prevent common passwords
  - [ ] Rate limit password attempts

- [ ] **Token Security**
  - [ ] Short-lived access tokens (15 min)
  - [ ] Secure refresh token storage
  - [ ] Token rotation on refresh
  - [ ] Blacklist on logout

- [ ] **Network Security**
  - [ ] HTTPS only in production
  - [ ] Secure cookie flags
  - [ ] HSTS headers
  - [ ] CSP headers

- [ ] **Input Validation**
  - [ ] Email format validation
  - [ ] SQL injection prevention
  - [ ] XSS prevention
  - [ ] Request size limits

- [ ] **Monitoring**
  - [ ] Failed login attempts
  - [ ] Unusual activity detection
  - [ ] Audit trail for sensitive operations
  - [ ] Real-time alerting

## Reflection Points

1. **Token Invalidation Strategy**
   - How to handle token revocation at scale?
   - Should we use token blacklisting or versioning?
   - What's the impact on distributed systems?

2. **Session Consistency**
   - How to handle concurrent sessions?
   - What happens when a user changes password?
   - How to sync sessions across devices?

3. **OAuth Account Linking**
   - What if email already exists?
   - How to handle provider-specific data?
   - What about permission mapping?

4. **Performance Considerations**
   - How to minimize database queries?
   - When to cache authentication data?
   - How to handle high login volumes?

5. **Security Trade-offs**
   - Convenience vs. security balance?
   - How strict should rate limiting be?
   - When to require re-authentication?

## Testing Strategy

### Unit Tests
```typescript
describe('JWTService', () => {
  it('should generate valid token pair', async () => {
    const tokens = await jwtService.generateTokenPair('user123', 'session456');
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
    expect(tokens.expiresIn).toBe(900);
  });
  
  it('should reject expired tokens', async () => {
    const expiredToken = generateExpiredToken();
    await expect(jwtService.verify(expiredToken)).rejects.toThrow('Token expired');
  });
});
```

### Integration Tests
```typescript
describe('Auth Flow', () => {
  it('should complete registration flow', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User'
      });
      
    expect(response.status).toBe(201);
    expect(response.body.tokens).toBeDefined();
  });
});
```

### Security Tests
```typescript
describe('Security', () => {
  it('should prevent SQL injection', async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: maliciousInput,
        password: 'password'
      });
      
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid input');
  });
});
```

## Production Readiness

1. **Environment Variables**
   ```env
   JWT_SECRET=<32-byte-random>
   JWT_REFRESH_SECRET=<32-byte-random>
   DATABASE_URL=postgresql://...
   REDIS_URL=redis://...
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```

2. **Monitoring Setup**
   - Login success/failure rates
   - Token generation metrics
   - OAuth provider availability
   - Response time tracking

3. **Deployment Considerations**
   - Health check endpoints
   - Graceful shutdown
   - Zero-downtime deployments
   - Secret rotation strategy

This PRP template provides the foundation for building a secure, scalable authentication system. Use it as a guide while implementing each component, always keeping security and user experience in balance.
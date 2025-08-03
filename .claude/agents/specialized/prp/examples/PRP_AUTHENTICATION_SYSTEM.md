# 🧠 PRP: Authentication System

## 📋 Basic Information
- **ID**: PRP_AUTHENTICATION_SYSTEM
- **Title**: Comprehensive Authentication System Pattern
- **Created**: 2024-01-15
- **Status**: Active
- **Priority**: High
- **Tags**: authentication, security, oauth2, jwt, session

## 🎯 Objective
Define a comprehensive authentication system pattern that supports multiple authentication methods (OAuth2, JWT, sessions), implements proper security measures, and provides a consistent interface for user authentication across different platforms and services.

## 🏗️ Architecture

### System Components
- **Authentication Service**: Core service handling all auth operations
- **Token Manager**: JWT generation, validation, and refresh
- **OAuth2 Provider**: Integration with external OAuth2 providers
- **Session Store**: Redis-based session management
- **User Repository**: User data persistence layer
- **Security Middleware**: Request validation and protection

### Integration Points
- REST API endpoints for authentication operations
- WebSocket support for real-time auth events
- Database integration for user persistence
- Cache layer for performance optimization
- Message queue for async operations

## 🔄 Workflow

### Step 1: Initial Authentication Request
- Receive authentication request (username/password, OAuth2, or existing token)
- Validate request format and required fields
- Apply rate limiting and security checks
- Route to appropriate authentication handler

### Step 2: Credential Validation
- For username/password: Hash comparison with bcrypt
- For OAuth2: Validate with external provider
- For tokens: Verify signature and expiration
- Check user status and permissions

### Step 3: Token Generation
- Generate JWT with appropriate claims
- Set proper expiration times
- Include refresh token if applicable
- Store session data in Redis

### Step 4: Response Preparation
- Format authentication response
- Include tokens and user profile
- Set secure HTTP-only cookies
- Add CORS headers as needed

## 📊 Use Cases

### Use Case 1: Web Application Login
**Context**: User logging into web application
**Action**: Submit username/password via login form
**Result**: JWT token stored in HTTP-only cookie, user redirected to dashboard

### Use Case 2: Mobile App Authentication
**Context**: Mobile app needs to authenticate user
**Action**: Use OAuth2 flow with PKCE
**Result**: Access and refresh tokens stored securely in mobile keychain

### Use Case 3: API Authentication
**Context**: Third-party service accessing API
**Action**: Include JWT in Authorization header
**Result**: Request validated and processed with appropriate permissions

### Use Case 4: Single Sign-On (SSO)
**Context**: User accessing multiple related services
**Action**: Authenticate once, access all services
**Result**: Seamless access across service boundaries

## 🔗 References

### Internal References
- PRP_USER_MANAGEMENT: User profile and permissions management
- PRP_API_SECURITY: API security best practices
- PRP_SESSION_MANAGEMENT: Detailed session handling patterns

### External References
- [OAuth 2.0 RFC](https://tools.ietf.org/html/rfc6749): OAuth2 specification
- [JWT RFC](https://tools.ietf.org/html/rfc7519): JSON Web Token specification
- [OWASP Authentication Guide](https://owasp.org/www-project-cheat-sheets/cheatsheets/Authentication_Cheat_Sheet): Security best practices

## 📝 Implementation Notes

### Technical Considerations
- Use bcrypt with cost factor 12 for password hashing
- Implement JWT rotation for enhanced security
- Store refresh tokens securely with encryption
- Use constant-time comparison for token validation
- Implement proper CSRF protection

### Performance Optimization
- Cache validated tokens in Redis (5-minute TTL)
- Use connection pooling for database queries
- Implement request coalescing for OAuth2 validation
- Lazy-load user permissions only when needed
- Use HTTP/2 for improved API performance

### Security Considerations
- Enforce HTTPS for all authentication endpoints
- Implement account lockout after failed attempts
- Use secure random generators for tokens
- Regular security audits and penetration testing
- Monitor for suspicious authentication patterns

### Code Example (Node.js with Express)
```javascript
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

class AuthenticationService {
  async authenticate(credentials) {
    // Validate input
    if (!credentials.username || !credentials.password) {
      throw new ValidationError('Missing credentials');
    }

    // Get user from database
    const user = await this.userRepository.findByUsername(credentials.username);
    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Verify password
    const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Store session
    await this.sessionStore.create(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user)
    };
  }

  generateAccessToken(user) {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        roles: user.roles
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '15m',
        issuer: 'auth-service',
        audience: 'api'
      }
    );
  }
}
```

## 🔄 Version History
- v1.0 (2024-01-15): Initial creation with basic auth patterns
- v1.1 (2024-01-20): Added OAuth2 integration details
- v1.2 (2024-01-25): Enhanced security considerations
- v1.3 (2024-02-01): Added performance optimization strategies
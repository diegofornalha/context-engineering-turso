# PRP Authentication System Example

A complete example demonstrating how to use the PRP (Prompt-Reflection-Pattern) framework to build a production-ready authentication system with JWT tokens, OAuth2 integration, and advanced security features.

## 🚀 Quick Start

This example follows the PRP framework's 3-step process:

1. **Initial Context** - Read `INITIAL.md` to understand requirements
2. **Generate PRPs** - Use `/generate-auth-prp` command to create specialized prompts
3. **Execute Implementation** - Use `/execute-auth-prp` command to build the system

## 📁 Project Structure

```
prp-authentication/
├── INITIAL.md                    # Starting point with requirements
├── .claude/commands/             # Claude commands for PRP workflow
│   ├── generate-auth-prp.md      # Generates authentication PRPs
│   └── execute-auth-prp.md       # Executes implementation
├── PRPs/                         # Generated prompt patterns
│   └── templates/
│       └── prp_auth_base.md      # Base authentication template
└── implementation/               # Actual code implementation
    ├── src/                      # Source code
    ├── tests/                    # Test suites
    ├── docs/                     # Documentation
    ├── package.json              # Dependencies
    └── tsconfig.json             # TypeScript config
```

## 🔧 Features Implemented

### Core Authentication
- ✅ JWT token-based authentication
- ✅ Refresh token mechanism
- ✅ Secure password hashing (bcrypt)
- ✅ Email verification flow
- ✅ Password reset functionality

### OAuth2 Integration
- ✅ Google OAuth2 login
- ✅ GitHub OAuth2 login
- ✅ Account linking
- ✅ Permission mapping

### Security Features
- ✅ Two-factor authentication (2FA)
- ✅ Rate limiting per endpoint
- ✅ Security headers (Helmet.js)
- ✅ CORS protection
- ✅ Input validation (Zod)
- ✅ SQL injection prevention
- ✅ XSS protection

### Session Management
- ✅ Redis-backed sessions
- ✅ Concurrent session handling
- ✅ Device tracking
- ✅ Session invalidation

## 🛠️ Technical Stack

- **Backend**: Node.js with Express/TypeScript
- **Authentication**: Passport.js, JWT, bcrypt
- **Database**: PostgreSQL with Knex.js
- **Session Store**: Redis
- **Validation**: Zod schema validation
- **Testing**: Jest with Supertest
- **Security**: Helmet, CORS, express-rate-limit

## 📚 Using the PRP Framework

### Step 1: Understanding the Context

Start by reading `INITIAL.md` which contains:
- System requirements
- Architecture overview
- Implementation phases
- Success criteria

### Step 2: Generating PRPs

Run the generate command to create specialized prompts:

```bash
# In Claude Code
/generate-auth-prp
```

This will create multiple PRP files:
- `prp_jwt_service.md` - JWT implementation patterns
- `prp_oauth_integration.md` - OAuth2 provider patterns
- `prp_security_middleware.md` - Security layer patterns
- `prp_user_management.md` - User flow patterns
- `prp_test_strategy.md` - Testing patterns
- `prp_deployment.md` - Deployment patterns

### Step 3: Executing Implementation

Run the execute command to build the system:

```bash
# In Claude Code
/execute-auth-prp
```

This will:
1. Set up the project structure
2. Implement core services
3. Add security middleware
4. Create API endpoints
5. Write comprehensive tests
6. Generate documentation

## 🔒 Security Best Practices

The implementation follows OWASP guidelines:

1. **Authentication**
   - Passwords hashed with bcrypt (12+ rounds)
   - JWT tokens with short expiry (15 minutes)
   - Refresh tokens rotated on use

2. **Authorization**
   - Role-based access control (RBAC)
   - Permission-based endpoints
   - Token scope validation

3. **Data Protection**
   - HTTPS enforcement
   - Secure cookie flags
   - Environment variable management

4. **Input Validation**
   - Zod schema validation
   - SQL parameterized queries
   - XSS prevention

## 🧪 Testing

The example includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run with coverage
npm test:coverage

# Run specific test suite
npm test auth.test.ts
```

Test categories:
- **Unit Tests**: Service logic, utilities
- **Integration Tests**: API endpoints, database
- **Security Tests**: Vulnerability testing
- **Performance Tests**: Load testing

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login with credentials |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout and invalidate |
| GET | `/auth/verify-email` | Verify email address |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password |
| GET | `/auth/oauth/google` | Google OAuth flow |
| GET | `/auth/oauth/github` | GitHub OAuth flow |
| POST | `/auth/2fa/setup` | Setup 2FA |
| POST | `/auth/2fa/verify` | Verify 2FA code |

## 🚀 Deployment

### Development
```bash
cd implementation
npm install
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Environment Variables
```env
# JWT Secrets
JWT_SECRET=your-32-byte-secret
JWT_REFRESH_SECRET=your-32-byte-refresh-secret

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/authdb

# Redis
REDIS_URL=redis://localhost:6379

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-secret

# Email Service
SMTP_HOST=smtp.example.com
SMTP_USER=noreply@example.com
SMTP_PASS=your-smtp-password

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret
```

## 📈 Performance Metrics

The system is designed to handle:
- 1000+ concurrent users
- <100ms response time for auth endpoints
- 99.9% uptime SLA
- Horizontal scaling with Redis sessions

## 🔍 Monitoring

Recommended monitoring setup:
- **Metrics**: Login success/failure rates
- **Alerts**: Failed login threshold
- **Logs**: Audit trail for sensitive operations
- **APM**: Response time tracking

## 🤝 Contributing

This is an example project demonstrating PRP framework usage. Feel free to:
- Fork and modify for your needs
- Submit improvements via pull requests
- Report issues or suggestions

## 📄 License

MIT License - Use freely in your projects

---

**Built with the PRP Framework** - A systematic approach to AI-assisted development
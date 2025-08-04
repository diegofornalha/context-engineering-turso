# PRP Authentication System Example

This example demonstrates how to use the PRP (Prompt-Reflection-Pattern) framework to build a production-ready authentication system with JWT and OAuth2 support.

## Overview

The PRP framework follows a 3-step process:

1. **Initial Context** (this file) - Sets up the foundation
2. **Generate PRP** - Creates specialized prompts using `/generate-auth-prp`
3. **Execute PRP** - Implements the system using `/execute-auth-prp`

## System Requirements

### Authentication Features
- JWT token-based authentication
- OAuth2 integration (Google, GitHub)
- Session management
- Password reset flow
- Two-factor authentication (2FA)
- Rate limiting and security headers

### Technical Stack
- Node.js with Express/Fastify
- TypeScript for type safety
- PostgreSQL/MySQL with migrations
- Redis for session storage
- Passport.js for OAuth strategies
- bcrypt for password hashing
- JSON Web Tokens (JWT)
- Speakeasy for 2FA

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│     API      │────▶│  Database   │
│  (SPA/App)  │     │   Gateway    │     │ (PostgreSQL)│
└─────────────┘     └──────────────┘     └─────────────┘
                            │
                    ┌───────┴────────┐
                    │                │
              ┌─────▼──────┐  ┌─────▼──────┐
              │    Auth    │  │   Redis    │
              │  Service   │  │  (Sessions)│
              └────────────┘  └────────────┘
```

## Implementation Phases

### Phase 1: Core Authentication
- User registration with email verification
- Login with JWT generation
- Token refresh mechanism
- Logout and token invalidation

### Phase 2: OAuth Integration
- OAuth2 provider setup
- Social login flows
- Account linking
- Permission scopes

### Phase 3: Security Enhancements
- Two-factor authentication
- Rate limiting per endpoint
- Brute force protection
- Security headers (CORS, CSP, etc.)

### Phase 4: Advanced Features
- Password reset with secure tokens
- Remember me functionality
- Device management
- Audit logging

## Next Steps

1. Generate the authentication PRP:
   ```
   /generate-auth-prp
   ```

2. Execute the implementation:
   ```
   /execute-auth-prp
   ```

## Success Criteria

- [ ] All authentication endpoints are secure
- [ ] OAuth2 providers are properly integrated
- [ ] JWT tokens are properly validated
- [ ] Rate limiting prevents abuse
- [ ] 2FA adds extra security layer
- [ ] Comprehensive test coverage (>80%)
- [ ] Production-ready deployment guide

## Security Considerations

- Never store plain text passwords
- Use secure random tokens
- Implement proper CORS policies
- Validate all user inputs
- Use HTTPS in production
- Implement request signing for sensitive operations
- Regular security audits

---

**Ready to begin?** Use `/generate-auth-prp` to create the specialized authentication prompts.
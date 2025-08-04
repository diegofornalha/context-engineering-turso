# PRP API Authentication Examples

This document provides comprehensive examples for implementing authentication in the PRP API, including JWT, OAuth2, and API key authentication patterns.

## Table of Contents
- [JWT Authentication](#jwt-authentication)
- [OAuth2 Authentication](#oauth2-authentication)
- [API Key Authentication](#api-key-authentication)
- [Multi-Factor Authentication](#multi-factor-authentication)
- [Session Management](#session-management)
- [Security Best Practices](#security-best-practices)

## JWT Authentication

### Server-Side Implementation (Node.js/Express)

```typescript
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { z } from 'zod';

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const refreshSchema = z.object({
  refreshToken: z.string()
});

// Token generation
function generateTokens(userId: string, email: string) {
  const payload = { userId, email };
  
  const accessToken = jwt.sign(
    payload,
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
  
  const refreshToken = jwt.sign(
    payload,
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
  
  return { accessToken, refreshToken };
}

// Login endpoint
app.post('/auth/login', async (req, res) => {
  try {
    // Validate input
    const { email, password } = loginSchema.parse(req.body);
    
    // Find user in database
    const user = await db.users.findOne({ email });
    if (!user) {
      return res.status(401).json({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      });
    }
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      });
    }
    
    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.email);
    
    // Store refresh token in database
    await db.refreshTokens.create({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    
    // Return response
    res.json({
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.errors
      });
    }
    
    console.error('Login error:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Internal server error'
    });
  }
});

// Refresh token endpoint
app.post('/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
    
    // Check if token exists in database
    const storedToken = await db.refreshTokens.findOne({
      token: refreshToken,
      userId: decoded.userId
    });
    
    if (!storedToken || storedToken.expiresAt < new Date()) {
      return res.status(401).json({
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired refresh token'
      });
    }
    
    // Generate new access token
    const accessToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
    
    res.json({
      accessToken,
      refreshToken,
      expiresIn: 900,
      tokenType: 'Bearer'
    });
    
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        code: 'INVALID_TOKEN',
        message: 'Invalid token'
      });
    }
    
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Internal server error'
    });
  }
});

// Logout endpoint
app.post('/auth/logout', authenticate, async (req, res) => {
  try {
    // Remove refresh token from database
    await db.refreshTokens.deleteMany({
      userId: req.user.userId
    });
    
    res.status(204).send();
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Internal server error'
    });
  }
});

// Authentication middleware
function authenticate(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      code: 'MISSING_TOKEN',
      message: 'Authentication token required'
    });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        code: 'TOKEN_EXPIRED',
        message: 'Token has expired'
      });
    }
    
    return res.status(401).json({
      code: 'INVALID_TOKEN',
      message: 'Invalid token'
    });
  }
}

// Protected route example
app.get('/api/profile', authenticate, async (req, res) => {
  const user = await db.users.findById(req.user.userId);
  res.json(user);
});
```

### Client-Side Implementation (React/TypeScript)

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';

// Types
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage helpers
const TOKEN_KEY = 'prp_access_token';
const REFRESH_TOKEN_KEY = 'prp_refresh_token';
const USER_KEY = 'prp_user';

class AuthService {
  private static instance: AuthService;
  private refreshPromise: Promise<string> | null = null;

  static getInstance() {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  setTokens(tokens: AuthTokens) {
    localStorage.setItem(TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    
    // Set axios default header
    axios.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
  }

  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  clearTokens() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    delete axios.defaults.headers.common['Authorization'];
  }

  async refreshAccessToken(): Promise<string> {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post('/auth/refresh', {
          refreshToken
        });

        const { accessToken } = response.data;
        this.setTokens(response.data);
        
        return accessToken;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }
}

// Axios interceptors
const authService = AuthService.getInstance();

// Request interceptor
axios.interceptors.request.use(
  (config) => {
    const token = authService.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
axios.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await authService.refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        authService.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth Provider Component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem(USER_KEY);
    const token = authService.getAccessToken();

    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('/auth/login', { email, password });
      const { user, ...tokens } = response.data;

      authService.setTokens(tokens);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      setUser(user);

    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Login failed');
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      await axios.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      authService.clearTokens();
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Protected Route Component
export function ProtectedRoute({ 
  children,
  requiredRole
}: { 
  children: React.ReactNode;
  requiredRole?: string;
}) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <div>Access denied. Insufficient permissions.</div>;
  }

  return <>{children}</>;
}

// Login Component Example
export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

## OAuth2 Authentication

### GitHub OAuth2 Implementation

```typescript
// Server-side OAuth2 handler
import { OAuth2Client } from 'oauth2-client';
import crypto from 'crypto';

class GitHubOAuth {
  private clientId = process.env.GITHUB_CLIENT_ID!;
  private clientSecret = process.env.GITHUB_CLIENT_SECRET!;
  private redirectUri = process.env.GITHUB_REDIRECT_URI!;
  
  // Store state values temporarily (use Redis in production)
  private stateStore = new Map<string, { timestamp: number; data?: any }>();

  generateAuthUrl(state?: any): string {
    const stateValue = crypto.randomBytes(32).toString('hex');
    
    // Store state with expiration
    this.stateStore.set(stateValue, {
      timestamp: Date.now(),
      data: state
    });
    
    // Clean old states
    this.cleanExpiredStates();
    
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'user:email read:user',
      state: stateValue,
      allow_signup: 'true'
    });
    
    return `https://github.com/login/oauth/authorize?${params}`;
  }

  async exchangeCodeForToken(code: string, state: string): Promise<any> {
    // Verify state
    const storedState = this.stateStore.get(state);
    if (!storedState) {
      throw new Error('Invalid state parameter');
    }
    
    // Check if state is expired (5 minutes)
    if (Date.now() - storedState.timestamp > 5 * 60 * 1000) {
      this.stateStore.delete(state);
      throw new Error('State parameter expired');
    }
    
    this.stateStore.delete(state);
    
    // Exchange code for token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      throw new Error(tokenData.error_description || 'Failed to exchange code');
    }
    
    // Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json'
      }
    });
    
    const userData = await userResponse.json();
    
    // Get user email if not public
    let email = userData.email;
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json'
        }
      });
      
      const emails = await emailsResponse.json();
      email = emails.find((e: any) => e.primary)?.email;
    }
    
    return {
      accessToken: tokenData.access_token,
      scope: tokenData.scope,
      tokenType: tokenData.token_type,
      user: {
        id: userData.id,
        login: userData.login,
        name: userData.name,
        email,
        avatarUrl: userData.avatar_url
      }
    };
  }
  
  private cleanExpiredStates() {
    const now = Date.now();
    for (const [state, data] of this.stateStore.entries()) {
      if (now - data.timestamp > 5 * 60 * 1000) {
        this.stateStore.delete(state);
      }
    }
  }
}

// Express routes
const githubOAuth = new GitHubOAuth();

app.get('/auth/oauth2/github', (req, res) => {
  const authUrl = githubOAuth.generateAuthUrl({
    returnTo: req.query.returnTo || '/'
  });
  res.redirect(authUrl);
});

app.get('/auth/oauth2/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      throw new Error('Missing code or state parameter');
    }
    
    const result = await githubOAuth.exchangeCodeForToken(
      code as string,
      state as string
    );
    
    // Find or create user
    let user = await db.users.findOne({ githubId: result.user.id });
    
    if (!user) {
      user = await db.users.create({
        githubId: result.user.id,
        email: result.user.email,
        name: result.user.name,
        avatarUrl: result.user.avatarUrl,
        role: 'developer'
      });
    }
    
    // Generate JWT tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.email);
    
    // Store refresh token
    await db.refreshTokens.create({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    
    // Redirect with tokens (in production, use secure cookies)
    const redirectUrl = new URL(process.env.FRONTEND_URL + '/auth/callback');
    redirectUrl.searchParams.set('accessToken', accessToken);
    redirectUrl.searchParams.set('refreshToken', refreshToken);
    
    res.redirect(redirectUrl.toString());
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('/login?error=oauth_failed');
  }
});
```

### Client-Side OAuth2 Flow

```typescript
// OAuth2 login component
export function OAuth2Login() {
  const handleGitHubLogin = () => {
    // Store current location for redirect after auth
    sessionStorage.setItem('authReturnTo', window.location.pathname);
    
    // Redirect to OAuth2 endpoint
    window.location.href = '/api/auth/oauth2/github';
  };
  
  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/oauth2/google';
  };
  
  return (
    <div className="oauth-buttons">
      <button onClick={handleGitHubLogin} className="github-button">
        <GithubIcon /> Continue with GitHub
      </button>
      
      <button onClick={handleGoogleLogin} className="google-button">
        <GoogleIcon /> Continue with Google
      </button>
    </div>
  );
}

// OAuth2 callback handler
export function OAuth2Callback() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const error = params.get('error');
    
    if (error) {
      navigate('/login?error=' + error);
      return;
    }
    
    if (accessToken && refreshToken) {
      // Store tokens
      authService.setTokens({ accessToken, refreshToken, expiresIn: 900 });
      
      // Get user info
      axios.get('/api/profile')
        .then(response => {
          localStorage.setItem(USER_KEY, JSON.stringify(response.data));
          
          // Redirect to stored location or dashboard
          const returnTo = sessionStorage.getItem('authReturnTo') || '/dashboard';
          sessionStorage.removeItem('authReturnTo');
          navigate(returnTo);
        })
        .catch(() => {
          navigate('/login?error=profile_failed');
        });
    } else {
      navigate('/login?error=missing_tokens');
    }
  }, [navigate]);
  
  return <div>Completing authentication...</div>;
}
```

## API Key Authentication

### Server Implementation

```typescript
// API Key model
interface ApiKey {
  id: string;
  key: string;
  name: string;
  userId: string;
  permissions: string[];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
}

// API Key generation
function generateApiKey(): string {
  // Format: prp_live_<random-32-chars>
  const prefix = process.env.NODE_ENV === 'production' ? 'prp_live_' : 'prp_test_';
  const random = crypto.randomBytes(32).toString('base64url');
  return prefix + random;
}

// API Key middleware
async function authenticateApiKey(req: any, res: any, next: any) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    return res.status(401).json({
      code: 'MISSING_API_KEY',
      message: 'API key required'
    });
  }
  
  try {
    // Hash the API key for storage comparison
    const hashedKey = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');
    
    const keyRecord = await db.apiKeys.findOne({ 
      keyHash: hashedKey 
    });
    
    if (!keyRecord) {
      return res.status(401).json({
        code: 'INVALID_API_KEY',
        message: 'Invalid API key'
      });
    }
    
    // Check expiration
    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      return res.status(401).json({
        code: 'API_KEY_EXPIRED',
        message: 'API key has expired'
      });
    }
    
    // Update last used timestamp
    await db.apiKeys.updateOne(
      { id: keyRecord.id },
      { lastUsedAt: new Date() }
    );
    
    // Get user
    const user = await db.users.findById(keyRecord.userId);
    
    req.user = user;
    req.apiKey = keyRecord;
    
    next();
  } catch (error) {
    console.error('API key auth error:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Internal server error'
    });
  }
}

// API Key management endpoints
app.post('/api/keys', authenticate, async (req, res) => {
  try {
    const { name, permissions, expiresIn } = req.body;
    
    const apiKey = generateApiKey();
    const hashedKey = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');
    
    const expiresAt = expiresIn 
      ? new Date(Date.now() + expiresIn * 1000)
      : null;
    
    const keyRecord = await db.apiKeys.create({
      key: apiKey.substring(0, 12) + '...',  // Store partial key for display
      keyHash: hashedKey,
      name,
      userId: req.user.userId,
      permissions: permissions || ['read'],
      expiresAt,
      createdAt: new Date()
    });
    
    // Return the full key only once
    res.status(201).json({
      id: keyRecord.id,
      key: apiKey,  // Full key shown only on creation
      name: keyRecord.name,
      permissions: keyRecord.permissions,
      expiresAt: keyRecord.expiresAt,
      createdAt: keyRecord.createdAt
    });
    
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to create API key'
    });
  }
});

// List API keys
app.get('/api/keys', authenticate, async (req, res) => {
  const keys = await db.apiKeys.find({ 
    userId: req.user.userId 
  });
  
  // Don't return the actual keys, only metadata
  const safeKeys = keys.map(k => ({
    id: k.id,
    name: k.name,
    key: k.key,  // Partial key like "prp_live_abc..."
    permissions: k.permissions,
    lastUsedAt: k.lastUsedAt,
    expiresAt: k.expiresAt,
    createdAt: k.createdAt
  }));
  
  res.json(safeKeys);
});

// Revoke API key
app.delete('/api/keys/:keyId', authenticate, async (req, res) => {
  const result = await db.apiKeys.deleteOne({
    id: req.params.keyId,
    userId: req.user.userId
  });
  
  if (result.deletedCount === 0) {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'API key not found'
    });
  }
  
  res.status(204).send();
});
```

### Client Usage

```typescript
// Using API Key in requests
class ApiKeyClient {
  constructor(private apiKey: string) {}
  
  async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`https://api.prp.dev/v1${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }
    
    return response.json();
  }
  
  // Helper methods
  async listPRPs(params?: any) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/prps?${query}`);
  }
  
  async createPRP(data: any) {
    return this.request('/prps', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}

// Usage
const client = new ApiKeyClient('prp_live_abc123...');
const prps = await client.listPRPs({ status: 'active' });
```

## Multi-Factor Authentication

### TOTP (Time-based One-Time Password) Implementation

```typescript
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// Enable 2FA
app.post('/auth/2fa/enable', authenticate, async (req, res) => {
  try {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `PRP (${req.user.email})`,
      issuer: 'PRP API'
    });
    
    // Store secret temporarily
    await db.tempSecrets.create({
      userId: req.user.userId,
      secret: secret.base32,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });
    
    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
    
    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntry: secret.otpauth_url
    });
    
  } catch (error) {
    console.error('2FA enable error:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to enable 2FA'
    });
  }
});

// Verify and confirm 2FA
app.post('/auth/2fa/verify', authenticate, async (req, res) => {
  try {
    const { token, secret } = req.body;
    
    // Get temporary secret
    const tempSecret = await db.tempSecrets.findOne({
      userId: req.user.userId,
      secret
    });
    
    if (!tempSecret) {
      return res.status(400).json({
        code: 'INVALID_SECRET',
        message: 'Invalid or expired secret'
      });
    }
    
    // Verify token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2
    });
    
    if (!verified) {
      return res.status(400).json({
        code: 'INVALID_TOKEN',
        message: 'Invalid verification code'
      });
    }
    
    // Enable 2FA for user
    await db.users.updateOne(
      { id: req.user.userId },
      { 
        twoFactorEnabled: true,
        twoFactorSecret: secret
      }
    );
    
    // Clean up temp secret
    await db.tempSecrets.deleteOne({ 
      userId: req.user.userId 
    });
    
    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );
    
    // Hash and store backup codes
    const hashedCodes = backupCodes.map(code => 
      crypto.createHash('sha256').update(code).digest('hex')
    );
    
    await db.backupCodes.create({
      userId: req.user.userId,
      codes: hashedCodes,
      createdAt: new Date()
    });
    
    res.json({
      message: '2FA enabled successfully',
      backupCodes
    });
    
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to verify 2FA'
    });
  }
});

// Login with 2FA
app.post('/auth/login/2fa', async (req, res) => {
  try {
    const { email, password, totpCode } = req.body;
    
    // First, verify email and password
    const user = await db.users.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
      return res.status(401).json({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials'
      });
    }
    
    // Check if 2FA is enabled
    if (!user.twoFactorEnabled) {
      // Regular login
      const tokens = generateTokens(user.id, user.email);
      return res.json({
        ...tokens,
        user: sanitizeUser(user)
      });
    }
    
    // Verify TOTP code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: totpCode,
      window: 2
    });
    
    if (!verified) {
      // Check backup codes
      const backupCodes = await db.backupCodes.findOne({ 
        userId: user.id 
      });
      
      const codeHash = crypto
        .createHash('sha256')
        .update(totpCode.toUpperCase())
        .digest('hex');
      
      const codeIndex = backupCodes?.codes.indexOf(codeHash);
      
      if (codeIndex === -1) {
        return res.status(401).json({
          code: 'INVALID_2FA_CODE',
          message: 'Invalid verification code'
        });
      }
      
      // Remove used backup code
      backupCodes.codes.splice(codeIndex, 1);
      await db.backupCodes.updateOne(
        { userId: user.id },
        { codes: backupCodes.codes }
      );
    }
    
    // Generate tokens
    const tokens = generateTokens(user.id, user.email);
    
    res.json({
      ...tokens,
      user: sanitizeUser(user)
    });
    
  } catch (error) {
    console.error('2FA login error:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Login failed'
    });
  }
});
```

## Session Management

### Redis-based Session Store

```typescript
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

class SessionManager {
  private redis: Redis;
  private sessionTTL = 60 * 60 * 24; // 24 hours
  
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });
  }
  
  async createSession(userId: string, metadata?: any): Promise<string> {
    const sessionId = uuidv4();
    const sessionData = {
      userId,
      createdAt: new Date().toISOString(),
      metadata: metadata || {}
    };
    
    await this.redis.setex(
      `session:${sessionId}`,
      this.sessionTTL,
      JSON.stringify(sessionData)
    );
    
    // Track user sessions
    await this.redis.sadd(`user:${userId}:sessions`, sessionId);
    
    return sessionId;
  }
  
  async getSession(sessionId: string): Promise<any | null> {
    const data = await this.redis.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }
  
  async refreshSession(sessionId: string): Promise<boolean> {
    const exists = await this.redis.expire(
      `session:${sessionId}`,
      this.sessionTTL
    );
    return exists === 1;
  }
  
  async deleteSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      await this.redis.del(`session:${sessionId}`);
      await this.redis.srem(
        `user:${session.userId}:sessions`,
        sessionId
      );
    }
  }
  
  async deleteAllUserSessions(userId: string): Promise<void> {
    const sessions = await this.redis.smembers(`user:${userId}:sessions`);
    
    if (sessions.length > 0) {
      const pipeline = this.redis.pipeline();
      
      sessions.forEach(sessionId => {
        pipeline.del(`session:${sessionId}`);
      });
      
      pipeline.del(`user:${userId}:sessions`);
      await pipeline.exec();
    }
  }
  
  async getUserActiveSessions(userId: string): Promise<any[]> {
    const sessionIds = await this.redis.smembers(`user:${userId}:sessions`);
    const sessions = [];
    
    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session) {
        sessions.push({
          id: sessionId,
          ...session
        });
      }
    }
    
    return sessions;
  }
}

// Session middleware
const sessionManager = new SessionManager();

async function sessionMiddleware(req: any, res: any, next: any) {
  const sessionId = req.cookies.sessionId || req.headers['x-session-id'];
  
  if (!sessionId) {
    return res.status(401).json({
      code: 'NO_SESSION',
      message: 'No session found'
    });
  }
  
  const session = await sessionManager.getSession(sessionId);
  
  if (!session) {
    return res.status(401).json({
      code: 'INVALID_SESSION',
      message: 'Invalid or expired session'
    });
  }
  
  // Refresh session
  await sessionManager.refreshSession(sessionId);
  
  req.session = session;
  req.user = { userId: session.userId };
  
  next();
}

// Session endpoints
app.post('/auth/sessions', authenticate, async (req, res) => {
  const sessions = await sessionManager.getUserActiveSessions(req.user.userId);
  res.json(sessions);
});

app.delete('/auth/sessions/:sessionId', authenticate, async (req, res) => {
  await sessionManager.deleteSession(req.params.sessionId);
  res.status(204).send();
});

app.delete('/auth/sessions', authenticate, async (req, res) => {
  await sessionManager.deleteAllUserSessions(req.user.userId);
  res.status(204).send();
});
```

## Security Best Practices

### 1. Password Security

```typescript
// Password validation
const passwordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
});

// Secure password hashing
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// Password strength checker
function checkPasswordStrength(password: string): {
  score: number;
  feedback: string[];
} {
  let score = 0;
  const feedback = [];
  
  if (password.length >= 12) score += 2;
  else if (password.length >= 8) score += 1;
  else feedback.push('Use at least 8 characters');
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Add uppercase letters');
  
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Add lowercase letters');
  
  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Add numbers');
  
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else feedback.push('Add special characters');
  
  // Check common passwords
  if (commonPasswords.includes(password.toLowerCase())) {
    score = 0;
    feedback.push('This password is too common');
  }
  
  return { score, feedback };
}
```

### 2. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

// Login rate limiter
const loginLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:login:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: {
    code: 'TOO_MANY_ATTEMPTS',
    message: 'Too many login attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by IP + email combination
    return `${req.ip}:${req.body.email}`;
  }
});

// API rate limiter
const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:api:'
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiters
app.use('/auth/login', loginLimiter);
app.use('/api', apiLimiter);
```

### 3. CSRF Protection

```typescript
import csrf from 'csurf';

// CSRF middleware
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// Apply CSRF protection to state-changing routes
app.use('/api', csrfProtection);

// Provide CSRF token to client
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

### 4. Security Headers

```typescript
import helmet from 'helmet';

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});
```

### 5. Input Validation and Sanitization

```typescript
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Input validation middleware
function validate(schema: z.ZodSchema) {
  return async (req: any, res: any, next: any) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(422).json({
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errors: error.errors
        });
      }
      next(error);
    }
  };
}

// Sanitize HTML content
function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href']
  });
}

// Example usage
const createPRPSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().transform(sanitizeHtml),
  projectId: z.string().uuid(),
  requirements: z.array(z.string()).max(10),
  estimatedHours: z.number().positive().max(1000)
});

app.post('/api/prps', 
  authenticate,
  validate(createPRPSchema),
  async (req, res) => {
    // req.body is now validated and sanitized
    const prp = await createPRP(req.body);
    res.json(prp);
  }
);
```

### 6. Audit Logging

```typescript
// Audit logger
class AuditLogger {
  async log(event: {
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    metadata?: any;
    ip?: string;
    userAgent?: string;
  }) {
    await db.auditLogs.create({
      ...event,
      timestamp: new Date(),
      id: uuidv4()
    });
  }
  
  // Log authentication events
  async logAuth(userId: string, action: string, success: boolean, metadata?: any) {
    await this.log({
      userId,
      action,
      resource: 'authentication',
      metadata: {
        ...metadata,
        success
      }
    });
  }
  
  // Log API access
  async logApiAccess(req: any, res: any) {
    await this.log({
      userId: req.user?.userId || 'anonymous',
      action: `${req.method} ${req.path}`,
      resource: 'api',
      metadata: {
        statusCode: res.statusCode,
        responseTime: res.responseTime
      },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
  }
}

const auditLogger = new AuditLogger();

// Audit middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    res.responseTime = Date.now() - start;
    
    // Log API access for authenticated routes
    if (req.user) {
      auditLogger.logApiAccess(req, res);
    }
  });
  
  next();
});
```
import { EventEmitter } from 'events';
import { TursoEdgeNetwork } from '../infrastructure/turso-edge';
import { SwarmCoordinator } from '../swarm/coordinator';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';

/**
 * Auth Service
 * Serviço de autenticação distribuído com JWT e OAuth2
 */
export class AuthService extends EventEmitter {
  private jwtSecret: string;
  private refreshTokens: Map<string, RefreshToken> = new Map();
  private blacklistedTokens: Set<string> = new Set();
  private metrics: ServiceMetrics;

  constructor(
    private turso: TursoEdgeNetwork,
    private swarm: SwarmCoordinator
  ) {
    super();
    this.jwtSecret = process.env.JWT_SECRET || 'development-secret';
    this.metrics = {
      requests: 0,
      successfulAuth: 0,
      failedAuth: 0,
      avgResponseTime: 0
    };
  }

  /**
   * Inicializar serviço
   */
  async initialize(): Promise<void> {
    // Criar tabelas necessárias
    await this.createTables();
    
    // Configurar refresh token cleanup
    setInterval(() => this.cleanupExpiredTokens(), 3600000); // 1 hora
  }

  /**
   * Criar tabelas no banco
   */
  private async createTables(): Promise<void> {
    // Tabela de usuários
    await this.turso.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        region TEXT,
        created_at INTEGER,
        updated_at INTEGER,
        last_login INTEGER,
        is_active BOOLEAN DEFAULT TRUE,
        metadata TEXT
      )
    `, [], { write: true });
    
    // Tabela de refresh tokens
    await this.turso.execute(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at INTEGER,
        created_at INTEGER,
        device_info TEXT,
        ip_address TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `, [], { write: true });
    
    // Tabela de audit log
    await this.turso.execute(`
      CREATE TABLE IF NOT EXISTS auth_audit_log (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        event_type TEXT,
        ip_address TEXT,
        user_agent TEXT,
        success BOOLEAN,
        error_message TEXT,
        timestamp INTEGER
      )
    `, [], { write: true });
    
    // Índices para performance
    await this.turso.execute(
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      [], { write: true }
    );
    
    await this.turso.execute(
      'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)',
      [], { write: true }
    );
  }

  /**
   * Registrar novo usuário
   */
  async register(userData: RegisterData): Promise<AuthResult> {
    const startTime = Date.now();
    
    try {
      // Validar dados
      const validation = this.validateUserData(userData);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }
      
      // Verificar se email já existe
      const existing = await this.turso.execute(
        'SELECT id FROM users WHERE email = ?',
        [userData.email]
      );
      
      if (existing.rows.length > 0) {
        return {
          success: false,
          error: 'Email já cadastrado'
        };
      }
      
      // Hash da senha
      const passwordHash = await bcrypt.hash(userData.password, 10);
      
      // Criar usuário
      const userId = this.generateUserId();
      const now = Date.now();
      
      await this.turso.execute(`
        INSERT INTO users (
          id, email, password_hash, full_name, region, 
          created_at, updated_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        userData.email,
        passwordHash,
        userData.fullName,
        userData.region || 'us-east-1',
        now,
        now,
        JSON.stringify(userData.metadata || {})
      ], { write: true });
      
      // Gerar tokens
      const tokens = await this.generateTokens(userId);
      
      // Audit log
      await this.logAuthEvent({
        userId,
        eventType: 'register',
        ipAddress: userData.ipAddress,
        userAgent: userData.userAgent,
        success: true
      });
      
      // Notificar swarm
      await this.swarm.notifyAgent('data-analyst', {
        type: 'new_user_registered',
        userId,
        region: userData.region
      });
      
      this.recordMetrics('register', Date.now() - startTime, true);
      
      return {
        success: true,
        user: {
          id: userId,
          email: userData.email,
          fullName: userData.fullName,
          region: userData.region
        },
        tokens
      };
      
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      this.recordMetrics('register', Date.now() - startTime, false);
      
      return {
        success: false,
        error: 'Erro ao registrar usuário'
      };
    }
  }

  /**
   * Login de usuário
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    const startTime = Date.now();
    
    try {
      // Buscar usuário
      const result = await this.turso.execute(
        'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
        [credentials.email]
      );
      
      if (result.rows.length === 0) {
        this.recordMetrics('login', Date.now() - startTime, false);
        return {
          success: false,
          error: 'Credenciais inválidas'
        };
      }
      
      const user = result.rows[0];
      
      // Verificar senha
      const validPassword = await bcrypt.compare(
        credentials.password,
        user.password_hash as string
      );
      
      if (!validPassword) {
        await this.logAuthEvent({
          userId: user.id as string,
          eventType: 'login_failed',
          ipAddress: credentials.ipAddress,
          userAgent: credentials.userAgent,
          success: false,
          errorMessage: 'Invalid password'
        });
        
        this.recordMetrics('login', Date.now() - startTime, false);
        
        return {
          success: false,
          error: 'Credenciais inválidas'
        };
      }
      
      // Atualizar último login
      await this.turso.execute(
        'UPDATE users SET last_login = ? WHERE id = ?',
        [Date.now(), user.id],
        { write: true }
      );
      
      // Gerar tokens
      const tokens = await this.generateTokens(user.id as string);
      
      // Salvar refresh token
      await this.saveRefreshToken(
        tokens.refreshToken,
        user.id as string,
        credentials.deviceInfo,
        credentials.ipAddress
      );
      
      // Audit log
      await this.logAuthEvent({
        userId: user.id as string,
        eventType: 'login',
        ipAddress: credentials.ipAddress,
        userAgent: credentials.userAgent,
        success: true
      });
      
      this.recordMetrics('login', Date.now() - startTime, true);
      
      return {
        success: true,
        user: {
          id: user.id as string,
          email: user.email as string,
          fullName: user.full_name as string,
          region: user.region as string
        },
        tokens
      };
      
    } catch (error) {
      console.error('Erro no login:', error);
      this.recordMetrics('login', Date.now() - startTime, false);
      
      return {
        success: false,
        error: 'Erro ao fazer login'
      };
    }
  }

  /**
   * Validar token JWT
   */
  async validateToken(token: string): Promise<User | null> {
    const startTime = Date.now();
    
    try {
      // Verificar se está na blacklist
      if (this.blacklistedTokens.has(token)) {
        return null;
      }
      
      // Decodificar e verificar token
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;
      
      // Buscar usuário atualizado
      const result = await this.turso.execute(
        'SELECT * FROM users WHERE id = ? AND is_active = TRUE',
        [decoded.userId],
        { region: decoded.region } // Usar região do token para otimizar
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const user = result.rows[0];
      
      this.recordMetrics('validateToken', Date.now() - startTime, true);
      
      return {
        id: user.id as string,
        email: user.email as string,
        fullName: user.full_name as string,
        region: user.region as string
      };
      
    } catch (error) {
      this.recordMetrics('validateToken', Date.now() - startTime, false);
      return null;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<TokenPair | null> {
    try {
      // Verificar se refresh token existe
      const result = await this.turso.execute(
        'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > ?',
        [refreshToken, Date.now()]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const tokenData = result.rows[0];
      
      // Gerar novos tokens
      const tokens = await this.generateTokens(tokenData.user_id as string);
      
      // Invalidar refresh token antigo
      await this.turso.execute(
        'DELETE FROM refresh_tokens WHERE token = ?',
        [refreshToken],
        { write: true }
      );
      
      // Salvar novo refresh token
      await this.saveRefreshToken(
        tokens.refreshToken,
        tokenData.user_id as string,
        tokenData.device_info as string,
        tokenData.ip_address as string
      );
      
      return tokens;
      
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      return null;
    }
  }

  /**
   * Logout
   */
  async logout(token: string, refreshToken?: string): Promise<void> {
    // Adicionar token à blacklist
    this.blacklistedTokens.add(token);
    
    // Remover refresh token se fornecido
    if (refreshToken) {
      await this.turso.execute(
        'DELETE FROM refresh_tokens WHERE token = ?',
        [refreshToken],
        { write: true }
      );
    }
    
    // Limpar blacklist após expiração do token
    setTimeout(() => {
      this.blacklistedTokens.delete(token);
    }, 3600000); // 1 hora
  }

  /**
   * Gerar par de tokens
   */
  private async generateTokens(userId: string): Promise<TokenPair> {
    // Buscar região do usuário para otimização
    const userResult = await this.turso.execute(
      'SELECT region FROM users WHERE id = ?',
      [userId]
    );
    
    const region = userResult.rows[0]?.region || 'us-east-1';
    
    // Access token (15 minutos)
    const accessToken = jwt.sign(
      {
        userId,
        region,
        type: 'access'
      },
      this.jwtSecret,
      {
        expiresIn: '15m',
        issuer: 'distributed-ecommerce'
      }
    );
    
    // Refresh token (7 dias)
    const refreshToken = this.generateRefreshToken();
    
    return { accessToken, refreshToken };
  }

  /**
   * Gerar refresh token
   */
  private generateRefreshToken(): string {
    return `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Salvar refresh token
   */
  private async saveRefreshToken(
    token: string,
    userId: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<void> {
    await this.turso.execute(`
      INSERT INTO refresh_tokens (
        token, user_id, expires_at, created_at, device_info, ip_address
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      token,
      userId,
      Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 dias
      Date.now(),
      deviceInfo || null,
      ipAddress || null
    ], { write: true });
  }

  /**
   * Limpar tokens expirados
   */
  private async cleanupExpiredTokens(): Promise<void> {
    await this.turso.execute(
      'DELETE FROM refresh_tokens WHERE expires_at < ?',
      [Date.now()],
      { write: true }
    );
  }

  /**
   * Log de evento de autenticação
   */
  private async logAuthEvent(event: AuthEvent): Promise<void> {
    const id = `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await this.turso.execute(`
      INSERT INTO auth_audit_log (
        id, user_id, event_type, ip_address, user_agent, 
        success, error_message, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      event.userId || null,
      event.eventType,
      event.ipAddress || null,
      event.userAgent || null,
      event.success,
      event.errorMessage || null,
      Date.now()
    ], { write: true });
  }

  /**
   * Validar dados do usuário
   */
  private validateUserData(userData: RegisterData): ValidationResult {
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      return { valid: false, error: 'Email inválido' };
    }
    
    // Validar senha
    if (userData.password.length < 8) {
      return { valid: false, error: 'Senha deve ter pelo menos 8 caracteres' };
    }
    
    // Validar nome
    if (!userData.fullName || userData.fullName.trim().length < 2) {
      return { valid: false, error: 'Nome completo é obrigatório' };
    }
    
    return { valid: true };
  }

  /**
   * Gerar ID único
   */
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Registrar métricas
   */
  private recordMetrics(operation: string, responseTime: number, success: boolean): void {
    this.metrics.requests++;
    
    if (success) {
      this.metrics.successfulAuth++;
    } else {
      this.metrics.failedAuth++;
    }
    
    // Atualizar média de tempo de resposta
    const totalTime = this.metrics.avgResponseTime * (this.metrics.requests - 1) + responseTime;
    this.metrics.avgResponseTime = totalTime / this.metrics.requests;
  }

  /**
   * Obter métricas
   */
  async getMetrics(): Promise<any> {
    const requestsPerSecond = this.metrics.requests / (process.uptime() || 1);
    
    return {
      totalRequests: this.metrics.requests,
      successfulAuth: this.metrics.successfulAuth,
      failedAuth: this.metrics.failedAuth,
      successRate: this.metrics.successfulAuth / (this.metrics.requests || 1),
      avgResponseTime: Math.round(this.metrics.avgResponseTime),
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.turso.execute('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    // Cleanup
    this.removeAllListeners();
  }
}

// Interfaces
interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  region?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface AuthResult {
  success: boolean;
  user?: User;
  tokens?: TokenPair;
  error?: string;
}

interface User {
  id: string;
  email: string;
  fullName: string;
  region: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface JWTPayload {
  userId: string;
  region: string;
  type: string;
}

interface RefreshToken {
  token: string;
  userId: string;
  expiresAt: number;
}

interface AuthEvent {
  userId?: string;
  eventType: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

interface ServiceMetrics {
  requests: number;
  successfulAuth: number;
  failedAuth: number;
  avgResponseTime: number;
}

export { AuthService, User, TokenPair };
# PRP API Integration Guide

This guide provides practical examples for integrating with the PRP (Pull Request Partner) API using various programming languages and frameworks.

## Table of Contents
- [Authentication](#authentication)
- [Basic CRUD Operations](#basic-crud-operations)
- [WebSocket Integration](#websocket-integration)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [SDK Examples](#sdk-examples)

## Authentication

### JWT Authentication Example

#### JavaScript/TypeScript

```typescript
import axios from 'axios';

const API_BASE_URL = 'https://api.prp.dev/v1';

class PRPClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  async login(email: string, password: string): Promise<void> {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password
      });

      this.accessToken = response.data.accessToken;
      this.refreshToken = response.data.refreshToken;

      // Set default authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;

    } catch (error) {
      console.error('Login failed:', error.response?.data);
      throw error;
    }
  }

  async refreshAccessToken(): Promise<void> {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken: this.refreshToken
      });

      this.accessToken = response.data.accessToken;
      axios.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;

    } catch (error) {
      console.error('Token refresh failed:', error.response?.data);
      throw error;
    }
  }

  // Axios interceptor for automatic token refresh
  setupInterceptors(): void {
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.refreshToken) {
          await this.refreshAccessToken();
          return axios.request(error.config);
        }
        return Promise.reject(error);
      }
    );
  }
}
```

#### Python

```python
import requests
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

class PRPClient:
    def __init__(self, base_url: str = "https://api.prp.dev/v1"):
        self.base_url = base_url
        self.session = requests.Session()
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None

    def login(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate with email and password"""
        response = self.session.post(
            f"{self.base_url}/auth/login",
            json={"email": email, "password": password}
        )
        response.raise_for_status()
        
        data = response.json()
        self.access_token = data["accessToken"]
        self.refresh_token = data["refreshToken"]
        self.token_expires_at = datetime.now() + timedelta(seconds=data["expiresIn"])
        
        # Set authorization header
        self.session.headers.update({
            "Authorization": f"Bearer {self.access_token}"
        })
        
        return data

    def refresh_access_token(self) -> Dict[str, Any]:
        """Refresh the access token"""
        response = self.session.post(
            f"{self.base_url}/auth/refresh",
            json={"refreshToken": self.refresh_token}
        )
        response.raise_for_status()
        
        data = response.json()
        self.access_token = data["accessToken"]
        self.token_expires_at = datetime.now() + timedelta(seconds=data["expiresIn"])
        
        # Update authorization header
        self.session.headers.update({
            "Authorization": f"Bearer {self.access_token}"
        })
        
        return data

    def _ensure_authenticated(self):
        """Ensure the client is authenticated with a valid token"""
        if not self.access_token:
            raise Exception("Not authenticated. Please login first.")
        
        # Check if token is about to expire
        if self.token_expires_at and datetime.now() >= self.token_expires_at - timedelta(minutes=5):
            self.refresh_access_token()
```

### OAuth2 Authentication Example

#### JavaScript/TypeScript

```typescript
// OAuth2 flow implementation
class OAuth2Client {
  private clientId = process.env.PRP_CLIENT_ID;
  private redirectUri = process.env.PRP_REDIRECT_URI;

  // Step 1: Generate authorization URL
  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId!,
      redirect_uri: this.redirectUri!,
      response_type: 'code',
      scope: 'read write',
      state: this.generateState()
    });

    return `https://api.prp.dev/oauth/authorize?${params}`;
  }

  // Step 2: Exchange code for token
  async exchangeCodeForToken(code: string): Promise<any> {
    const response = await fetch('https://api.prp.dev/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: process.env.PRP_CLIENT_SECRET,
        redirect_uri: this.redirectUri
      })
    });

    return response.json();
  }

  private generateState(): string {
    return Math.random().toString(36).substring(7);
  }
}
```

## Basic CRUD Operations

### Create a PRP

#### JavaScript/TypeScript

```typescript
interface CreatePRPRequest {
  projectId: string;
  name: string;
  description: string;
  requirements: string[];
  estimatedHours: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

async function createPRP(data: CreatePRPRequest) {
  try {
    const response = await axios.post(`${API_BASE_URL}/prps`, data);
    console.log('PRP created:', response.data);
    return response.data;
  } catch (error) {
    if (error.response?.status === 422) {
      console.error('Validation error:', error.response.data);
    }
    throw error;
  }
}

// Example usage
const newPRP = await createPRP({
  projectId: 'proj_123456',
  name: 'Implement User Authentication',
  description: 'Add JWT-based authentication to the API',
  requirements: [
    'JWT token generation',
    'Token validation middleware',
    'Refresh token mechanism',
    'Password hashing with bcrypt'
  ],
  estimatedHours: 8,
  priority: 'high'
});
```

#### Python

```python
from typing import List, Literal

def create_prp(
    self,
    project_id: str,
    name: str,
    description: str,
    requirements: List[str],
    estimated_hours: float,
    priority: Literal['low', 'medium', 'high', 'urgent'] = 'medium'
) -> Dict[str, Any]:
    """Create a new PRP"""
    self._ensure_authenticated()
    
    response = self.session.post(
        f"{self.base_url}/prps",
        json={
            "projectId": project_id,
            "name": name,
            "description": description,
            "requirements": requirements,
            "estimatedHours": estimated_hours,
            "priority": priority
        }
    )
    
    if response.status_code == 422:
        print(f"Validation error: {response.json()}")
    
    response.raise_for_status()
    return response.json()

# Example usage
prp = client.create_prp(
    project_id="proj_123456",
    name="Implement User Authentication",
    description="Add JWT-based authentication to the API",
    requirements=[
        "JWT token generation",
        "Token validation middleware",
        "Refresh token mechanism",
        "Password hashing with bcrypt"
    ],
    estimated_hours=8,
    priority="high"
)
```

### List PRPs with Pagination

#### JavaScript/TypeScript

```typescript
interface ListPRPsParams {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive' | 'pending';
  projectId?: string;
}

async function listPRPs(params: ListPRPsParams = {}) {
  const queryParams = new URLSearchParams();
  
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.status) queryParams.append('status', params.status);
  if (params.projectId) queryParams.append('projectId', params.projectId);

  const response = await axios.get(`${API_BASE_URL}/prps?${queryParams}`);
  return response.data;
}

// Example: Paginate through all PRPs
async function getAllPRPs() {
  const allPRPs = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await listPRPs({ page, limit: 50 });
    allPRPs.push(...response.data);
    
    hasMore = page < response.pagination.totalPages;
    page++;
  }

  return allPRPs;
}
```

### Update PRP

#### JavaScript/TypeScript

```typescript
async function updatePRP(prpId: string, updates: Partial<PRP>) {
  const response = await axios.put(`${API_BASE_URL}/prps/${prpId}`, updates);
  return response.data;
}

// Example: Update PRP status and hours
const updated = await updatePRP('prp_123456', {
  status: 'completed',
  actualHours: 7.5
});
```

### Delete PRP

#### JavaScript/TypeScript

```typescript
async function deletePRP(prpId: string): Promise<void> {
  await axios.delete(`${API_BASE_URL}/prps/${prpId}`);
}

// Example with error handling
try {
  await deletePRP('prp_123456');
  console.log('PRP deleted successfully');
} catch (error) {
  if (error.response?.status === 404) {
    console.error('PRP not found');
  }
  throw error;
}
```

## WebSocket Integration

### Real-time PRP Updates

#### JavaScript/TypeScript

```typescript
class PRPWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(token: string) {
    const wsUrl = 'wss://api.prp.dev/v1/ws/prps';
    
    this.ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    this.ws.on('open', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      
      // Subscribe to specific project
      this.subscribe('proj_123456');
    });

    this.ws.on('message', (data) => {
      const event = JSON.parse(data.toString());
      this.handleEvent(event);
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    this.ws.on('close', () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect(token);
    });
  }

  private handleEvent(event: any) {
    switch (event.type) {
      case 'prp.created':
        console.log('New PRP created:', event.data);
        break;
      case 'prp.updated':
        console.log('PRP updated:', event.data);
        break;
      case 'prp.status_changed':
        console.log('PRP status changed:', event.data);
        break;
      case 'prp.deleted':
        console.log('PRP deleted:', event.data);
        break;
      default:
        console.log('Unknown event:', event);
    }
  }

  subscribe(projectId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'subscribe',
        projectId
      }));
    }
  }

  unsubscribe(projectId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'unsubscribe',
        projectId
      }));
    }
  }

  private attemptReconnect(token: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
      
      setTimeout(() => {
        this.connect(token);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Usage
const prpSocket = new PRPWebSocket();
prpSocket.connect(accessToken);
```

#### Python with asyncio

```python
import asyncio
import websockets
import json
from typing import Optional, Callable

class PRPWebSocket:
    def __init__(self, token: str):
        self.token = token
        self.uri = "wss://api.prp.dev/v1/ws/prps"
        self.websocket: Optional[websockets.WebSocketClientProtocol] = None
        
    async def connect(self):
        """Connect to WebSocket server"""
        headers = {
            "Authorization": f"Bearer {self.token}"
        }
        
        self.websocket = await websockets.connect(
            self.uri,
            extra_headers=headers
        )
        
    async def subscribe(self, project_id: str):
        """Subscribe to project updates"""
        await self.websocket.send(json.dumps({
            "action": "subscribe",
            "projectId": project_id
        }))
        
    async def listen(self, handler: Callable):
        """Listen for messages"""
        async for message in self.websocket:
            event = json.loads(message)
            await handler(event)
            
    async def close(self):
        """Close WebSocket connection"""
        if self.websocket:
            await self.websocket.close()

# Usage example
async def handle_event(event):
    event_type = event.get('type')
    
    if event_type == 'prp.created':
        print(f"New PRP: {event['data']}")
    elif event_type == 'prp.updated':
        print(f"Updated PRP: {event['data']}")
    elif event_type == 'prp.status_changed':
        print(f"Status changed: {event['data']}")

async def main():
    ws = PRPWebSocket(token="your-token")
    await ws.connect()
    await ws.subscribe("proj_123456")
    
    try:
        await ws.listen(handle_event)
    finally:
        await ws.close()

# Run the WebSocket client
asyncio.run(main())
```

## Error Handling

### Comprehensive Error Handling

#### JavaScript/TypeScript

```typescript
class PRPError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PRPError';
  }
}

async function handleAPICall<T>(
  apiCall: () => Promise<T>
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const response = error.response;
      
      switch (response?.status) {
        case 400:
          throw new PRPError(
            'BAD_REQUEST',
            'Invalid request parameters',
            response.data
          );
        case 401:
          throw new PRPError(
            'UNAUTHORIZED',
            'Authentication required',
            response.data
          );
        case 403:
          throw new PRPError(
            'FORBIDDEN',
            'Insufficient permissions',
            response.data
          );
        case 404:
          throw new PRPError(
            'NOT_FOUND',
            'Resource not found',
            response.data
          );
        case 422:
          throw new PRPError(
            'VALIDATION_ERROR',
            'Validation failed',
            response.data.details
          );
        case 429:
          throw new PRPError(
            'RATE_LIMITED',
            `Rate limit exceeded. Retry after ${response.headers['retry-after']} seconds`,
            response.data
          );
        case 500:
          throw new PRPError(
            'SERVER_ERROR',
            'Internal server error',
            response.data
          );
        default:
          throw new PRPError(
            'UNKNOWN_ERROR',
            'An unknown error occurred',
            response.data
          );
      }
    }
    throw error;
  }
}

// Usage
try {
  const prp = await handleAPICall(() => 
    createPRP({
      projectId: 'proj_123456',
      name: 'New PRP',
      description: 'Description',
      requirements: ['req1'],
      estimatedHours: 5,
      priority: 'medium'
    })
  );
} catch (error) {
  if (error instanceof PRPError) {
    console.error(`Error ${error.code}: ${error.message}`);
    if (error.details) {
      console.error('Details:', error.details);
    }
  }
}
```

## Rate Limiting

### Handling Rate Limits

#### JavaScript/TypeScript

```typescript
class RateLimitedClient {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  
  async executeWithRateLimit<T>(
    fn: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          if (error.response?.status === 429) {
            const retryAfter = parseInt(
              error.response.headers['retry-after'] || '60'
            );
            console.log(`Rate limited. Retrying after ${retryAfter} seconds`);
            
            setTimeout(() => {
              this.executeWithRateLimit(fn).then(resolve).catch(reject);
            }, retryAfter * 1000);
          } else {
            reject(error);
          }
        }
      });
      
      if (!this.processing) {
        this.processQueue();
      }
    });
  }
  
  private async processQueue() {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        await task();
        // Add delay between requests to avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    this.processing = false;
  }
}

// Usage
const rateLimitedClient = new RateLimitedClient();

// Execute multiple requests with rate limiting
const promises = prpIds.map(id => 
  rateLimitedClient.executeWithRateLimit(() => 
    axios.get(`${API_BASE_URL}/prps/${id}`)
  )
);

const results = await Promise.all(promises);
```

## SDK Examples

### TypeScript SDK

```typescript
// prp-sdk.ts
export class PRPSDK {
  private client: PRPClient;
  private websocket: PRPWebSocket;
  
  constructor(config: {
    apiKey?: string;
    email?: string;
    password?: string;
  }) {
    this.client = new PRPClient();
    
    if (config.apiKey) {
      this.client.setApiKey(config.apiKey);
    }
  }
  
  // Authentication
  async login(email: string, password: string) {
    return this.client.login(email, password);
  }
  
  // PRP operations
  prps = {
    list: (params?: ListPRPsParams) => this.client.listPRPs(params),
    get: (id: string) => this.client.getPRP(id),
    create: (data: CreatePRPRequest) => this.client.createPRP(data),
    update: (id: string, data: UpdatePRPRequest) => this.client.updatePRP(id, data),
    delete: (id: string) => this.client.deletePRP(id)
  };
  
  // Agent operations
  agents = {
    list: (type?: string) => this.client.listAgents(type),
    assign: (agentId: string, prpId: string, priority?: string) => 
      this.client.assignAgent(agentId, prpId, priority)
  };
  
  // WebSocket
  realtime = {
    connect: (token: string) => {
      this.websocket = new PRPWebSocket();
      return this.websocket.connect(token);
    },
    subscribe: (projectId: string) => this.websocket.subscribe(projectId),
    disconnect: () => this.websocket.disconnect()
  };
}

// Usage
const sdk = new PRPSDK({ 
  email: 'user@example.com', 
  password: 'password' 
});

await sdk.login();

// Create a PRP
const prp = await sdk.prps.create({
  projectId: 'proj_123456',
  name: 'New Feature',
  description: 'Implement new feature',
  requirements: ['Requirement 1'],
  estimatedHours: 5,
  priority: 'high'
});

// Subscribe to real-time updates
await sdk.realtime.connect(sdk.client.accessToken);
await sdk.realtime.subscribe('proj_123456');
```

### Python SDK

```python
# prp_sdk.py
from typing import Optional, Dict, Any, List
import asyncio

class PRPSDK:
    def __init__(self, api_key: Optional[str] = None, 
                 email: Optional[str] = None, 
                 password: Optional[str] = None):
        self.client = PRPClient()
        self.websocket: Optional[PRPWebSocket] = None
        
        if api_key:
            self.client.set_api_key(api_key)
        elif email and password:
            self.client.login(email, password)
    
    # PRP operations
    class PRPs:
        def __init__(self, client):
            self.client = client
            
        def list(self, **params) -> Dict[str, Any]:
            return self.client.list_prps(**params)
            
        def get(self, prp_id: str) -> Dict[str, Any]:
            return self.client.get_prp(prp_id)
            
        def create(self, **data) -> Dict[str, Any]:
            return self.client.create_prp(**data)
            
        def update(self, prp_id: str, **data) -> Dict[str, Any]:
            return self.client.update_prp(prp_id, **data)
            
        def delete(self, prp_id: str) -> None:
            return self.client.delete_prp(prp_id)
    
    @property
    def prps(self):
        return self.PRPs(self.client)
    
    # Real-time operations
    async def connect_realtime(self, token: str):
        self.websocket = PRPWebSocket(token)
        await self.websocket.connect()
        
    async def subscribe(self, project_id: str):
        if self.websocket:
            await self.websocket.subscribe(project_id)

# Usage
sdk = PRPSDK(email="user@example.com", password="password")

# Create a PRP
prp = sdk.prps.create(
    project_id="proj_123456",
    name="New Feature",
    description="Implement new feature",
    requirements=["Requirement 1"],
    estimated_hours=5,
    priority="high"
)

# Get PRP details
prp_details = sdk.prps.get(prp["id"])

# List all PRPs
prps = sdk.prps.list(status="active", page=1, limit=20)
```

## Best Practices

1. **Always handle errors gracefully** - Implement comprehensive error handling for all API calls
2. **Use pagination** - When listing resources, always use pagination to avoid large responses
3. **Implement retry logic** - Add exponential backoff for transient failures
4. **Cache responses** - Cache frequently accessed data to reduce API calls
5. **Monitor rate limits** - Track your API usage and implement queuing for bulk operations
6. **Use WebSockets for real-time updates** - Don't poll the API for changes
7. **Secure your credentials** - Never hardcode API keys or passwords
8. **Validate input** - Validate data client-side before sending to the API
9. **Use SDK/client libraries** - Build or use existing client libraries for consistency
10. **Log API interactions** - Log requests and responses for debugging and monitoring
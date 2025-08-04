# Product Management REST API

A production-ready REST API for product management built using the Power Refactor Protocol (PRP) framework.

## Features

- ✅ RESTful API with full CRUD operations
- ✅ JWT authentication with role-based access control
- ✅ Comprehensive input validation
- ✅ Advanced querying (pagination, filtering, sorting, search)
- ✅ Rate limiting and security headers
- ✅ OpenAPI documentation with Swagger UI
- ✅ Structured logging
- ✅ Error handling with consistent responses
- ✅ MongoDB integration with Mongoose ODM
- ✅ Test coverage with Jest
- ✅ Docker support

## Quick Start

1. **Clone and Install**
   ```bash
   cd implementation
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start MongoDB**
   ```bash
   # Using Docker
   docker-compose up -d mongodb
   
   # Or use local MongoDB installation
   ```

4. **Run the Server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

5. **View API Documentation**
   Open http://localhost:3000/api-docs

## API Endpoints

### Products

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/products` | List products with pagination | No |
| GET | `/api/v1/products/search` | Search products | No |
| GET | `/api/v1/products/:id` | Get single product | No |
| POST | `/api/v1/products` | Create new product | Yes (Admin/Manager) |
| PUT | `/api/v1/products/:id` | Update entire product | Yes (Admin/Manager) |
| PATCH | `/api/v1/products/:id` | Partial product update | Yes (Admin/Manager) |
| DELETE | `/api/v1/products/:id` | Delete product | Yes (Admin) |
| POST | `/api/v1/products/:id/stock` | Update stock | Yes (Admin/Manager/Warehouse) |

### Query Parameters

#### Pagination
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

#### Sorting
- `sort` - Sort field(s), prefix with `-` for descending
  - Example: `sort=-price,name`

#### Filtering
- `category` - Filter by category
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `inStock` - Show only in-stock items
- `isActive` - Filter by active status

#### Field Selection
- `fields` - Comma-separated list of fields to return
  - Example: `fields=name,price,stock`

#### Search
- `q` - Search query (for search endpoint)

## Example Requests

### List Products with Filters
```bash
GET /api/v1/products?category=electronics&minPrice=100&sort=-price&page=2&limit=10
```

### Search Products
```bash
GET /api/v1/products/search?q=laptop&limit=20
```

### Create Product
```bash
POST /api/v1/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Gaming Laptop",
  "description": "High-performance laptop for gaming",
  "price": 1299.99,
  "stock": 50,
  "category": "electronics",
  "tags": ["gaming", "laptop", "performance"]
}
```

### Update Stock
```bash
POST /api/v1/products/123/stock
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 10,
  "operation": "add"
}
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error Type",
  "message": "Human-readable error message",
  "details": [
    // Additional error details
  ]
}
```

### Pagination Response
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "products": [...],
  "pagination": {
    "total": 100,
    "pages": 5,
    "page": 1,
    "limit": 20,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication.

### Obtaining a Token
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Using the Token
Include the token in the Authorization header:
```bash
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting

- Default: 100 requests per 15 minutes per IP
- Configurable via environment variables
- Headers included in response:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## Development

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Linting
```bash
npm run lint
```

### Database Migrations
```bash
npm run migrate
```

## Docker Support

### Using Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### Building Docker Image
```bash
docker build -t product-api .
docker run -p 3000:3000 --env-file .env product-api
```

## Project Structure

```
implementation/
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Request handlers
│   ├── middleware/       # Express middleware
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   └── utils/           # Helper utilities
├── tests/               # Test suites
├── docs/                # API documentation
├── logs/                # Application logs
└── scripts/             # Utility scripts
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | development |
| `PORT` | Server port | 3000 |
| `MONGODB_URI` | MongoDB connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | Token expiration | 7d |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 900000 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |
| `LOG_LEVEL` | Logging level | info |

## Security Considerations

- Helmet.js for security headers
- CORS configuration
- Input validation and sanitization
- Rate limiting
- JWT authentication
- Role-based access control
- MongoDB injection prevention
- XSS protection

## Performance Optimization

- Database indexing on frequently queried fields
- Response caching with ETags
- Pagination for large datasets
- Field projection to reduce payload size
- Connection pooling
- Compression middleware

## Contributing

This API was generated using the PRP framework. To modify or extend:

1. Update the PRP template in `PRPs/templates/`
2. Regenerate using `npx claude-code-cli generate-api-prp`
3. Execute the new PRP with `npx claude-code-cli execute-api-prp`

## License

MIT
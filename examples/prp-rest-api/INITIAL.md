# PRP REST API Example

This example demonstrates how to use the Power Refactor Protocol (PRP) framework to create a production-ready REST API with CRUD operations. We'll build a Product Management API that showcases best practices in API design, implementation, and documentation.

## Overview

This example uses PRP to generate and execute a complete REST API implementation with:
- RESTful resource endpoints for product management
- CRUD operations (Create, Read, Update, Delete)
- Pagination, filtering, and sorting
- Input validation and sanitization
- Comprehensive error handling
- JWT authentication integration
- OpenAPI documentation
- Rate limiting and security headers
- Database integration with migrations
- Comprehensive test suite

## Project Structure

```
examples/prp-rest-api/
├── INITIAL.md                    # This file - explains the example
├── .claude/commands/
│   ├── generate-api-prp.md      # Step 1: Generate the API PRP
│   └── execute-api-prp.md       # Step 2: Execute the generated PRP
├── PRPs/
│   ├── templates/
│   │   └── prp_api_base.md      # Base template for API PRPs
│   └── generated/               # Generated PRPs stored here
└── implementation/
    ├── src/
    │   ├── routes/              # API route definitions
    │   ├── controllers/         # Request handlers
    │   ├── services/            # Business logic
    │   ├── models/              # Data models
    │   ├── middleware/          # Express middleware
    │   └── utils/               # Utility functions
    ├── tests/                   # Test suites
    └── docs/
        └── openapi.yaml         # API documentation
```

## 3-Step Process

### Step 1: Generate the API PRP
```bash
# Run the generate command to create a PRP for your API
npx claude-code-cli generate-api-prp
```

This will:
- Analyze the API requirements
- Generate a comprehensive PRP document
- Include all necessary implementation details
- Define API endpoints and operations
- Specify validation rules and error handling

### Step 2: Execute the Generated PRP
```bash
# Execute the PRP to create the implementation
npx claude-code-cli execute-api-prp
```

This will:
- Create all source files
- Implement endpoints with proper error handling
- Set up database models and migrations
- Generate OpenAPI documentation
- Create a comprehensive test suite
- Configure middleware and security

### Step 3: Run and Test
```bash
# Install dependencies
cd implementation && npm install

# Run database migrations
npm run migrate

# Start the development server
npm run dev

# Run tests
npm test

# View API documentation at http://localhost:3000/api-docs
```

## Features Demonstrated

### 1. RESTful Design
- Proper resource naming (`/api/v1/products`)
- Correct HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Appropriate status codes (200, 201, 204, 400, 401, 404, etc.)
- HATEOAS links for resource navigation

### 2. Advanced Querying
- Pagination with limit/offset
- Filtering by multiple fields
- Sorting with multiple criteria
- Full-text search capabilities
- Field selection/projection

### 3. Security
- JWT authentication integration
- Role-based access control (RBAC)
- Input validation and sanitization
- Rate limiting per endpoint
- CORS configuration
- Security headers (helmet)

### 4. Error Handling
- Consistent error format
- Detailed validation errors
- Proper error status codes
- Error logging with correlation IDs
- Client-friendly error messages

### 5. Performance
- Database query optimization
- Response caching
- Compression
- Connection pooling
- Async/await patterns

### 6. Documentation
- OpenAPI 3.0 specification
- Interactive Swagger UI
- Request/response examples
- Authentication documentation
- Error response catalog

## Example API Endpoints

### Products Resource
- `GET /api/v1/products` - List products with pagination
- `GET /api/v1/products/:id` - Get single product
- `POST /api/v1/products` - Create new product
- `PUT /api/v1/products/:id` - Update entire product
- `PATCH /api/v1/products/:id` - Partial update
- `DELETE /api/v1/products/:id` - Delete product

### Query Examples
```
GET /api/v1/products?page=2&limit=20&sort=-createdAt
GET /api/v1/products?category=electronics&minPrice=100
GET /api/v1/products?search=laptop&fields=name,price,stock
```

## Benefits of Using PRP for APIs

1. **Consistency**: All endpoints follow the same patterns
2. **Completeness**: Nothing is forgotten (validation, errors, docs)
3. **Best Practices**: Automatically includes industry standards
4. **Speed**: Generate complete APIs in minutes
5. **Maintainability**: Clear structure and documentation
6. **Testability**: Comprehensive test coverage included

## Customization

The PRP template can be customized for different API types:
- GraphQL APIs
- gRPC services
- WebSocket servers
- Microservices
- Event-driven APIs

## Next Steps

1. Run `generate-api-prp` to create your first API PRP
2. Review and customize the generated PRP
3. Execute it to create the implementation
4. Extend with additional resources or features

This example provides a foundation for building production-ready APIs using the PRP framework, ensuring consistency, quality, and adherence to best practices.
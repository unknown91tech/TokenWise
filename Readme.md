# TokenWise — Real-Time Wallet Intelligence on Solana

A comprehensive real-time intelligence tool that monitors and analyzes wallet behavior for specific tokens on the Solana blockchain. Track the top 60 token holders, capture their transaction activity in real-time, and visualize market trends through a clean dashboard.

## Features

- **Top 60 Wallet Discovery**: Automatically identifies and tracks the largest token holders
- **Real-Time Transaction Monitoring**: Live tracking of buys/sells with sub-second updates
- **Protocol Detection**: Identifies transactions through Jupiter, Raydium, and Orca
- **Interactive Dashboard**: Clean, responsive interface with real-time charts and metrics
- **Historical Analysis**: Query past activity with custom time filters
- **Export Capabilities**: Download transaction data in CSV/JSON formats

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (React.js)    │◄──►│   (Node.js)     │◄──►│  (PostgreSQL)   │
│                 │    │                 │    │                 │
│ • Dashboard     │    │ • REST API      │    │ • Wallets       │
│ • Real-time UI  │    │ • WebSockets    │    │ • Transactions  │
│ • Charts        │    │ • Solana RPC    │    │ • Analytics     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 13+
- Redis (optional, for caching)

### 1. Clone the Repository

```bash
git clone https://github.com/unknown91tech/TokenWise.git
cd TokenWise
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/tokenwise
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tokenwise
DB_USER=your_username
DB_PASSWORD=your_password

# Solana Configuration
SOLANA_RPC_URL=""
SOLANA_WS_URL=""
TARGET_TOKEN_ADDRESS="9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump"

# Server Configuration
PORT=3001
NODE_ENV=development

# Redis (Optional)
REDIS_URL=redis://localhost:6379
```

Set up the database:

```bash
# Create database
createdb tokenwise

# Run migrations
npm run migrate

# Start the backend server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Project Structure

```
tokenwise/
├── backend/
│   ├── src/
│   │   ├── controllers/     # API route handlers
│   │   ├── services/        # Business logic
│   │   ├── models/          # Database models
│   │   ├── utils/           # Helper functions
│   │   ├── config/          # Configuration files
│   │   └── app.ts           # Express app setup
│   ├── migrations/          # Database migrations
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API calls
│   │   ├── utils/           # Helper functions
│   │   └── App.tsx          # Main app component
│   ├── public/
│   ├── package.json
│   └── .env
└── README.md
```

## Backend Commands

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run migrate      # Run database migrations
npm run seed         # Seed database with sample data
npm run db:reset     # Reset database

# Testing
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
```

## Frontend Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Testing
npm run test         # Run tests
npm run test:ui      # Run tests with UI
npm run coverage     # Generate test coverage
```

## API Endpoints

### Wallets
- `GET /api/wallets` - Get top 60 token holders
- `GET /api/wallets/:address` - Get specific wallet details
- `GET /api/wallets/:address/transactions` - Get wallet transaction history

### Transactions
- `GET /api/transactions` - Get recent transactions (with filters)
- `GET /api/transactions/:signature` - Get specific transaction details

### Analytics
- `GET /api/insights` - Get real-time market insights
- `GET /api/insights/protocol-stats` - Get protocol usage statistics
- `GET /api/insights/trends` - Get market trend analysis

### WebSocket Events
- `wallet_update` - Real-time wallet balance changes
- `new_transaction` - New buy/sell transactions
- `market_metrics` - Updated market statistics

## Key Features Explained

### Real-Time Monitoring
The system uses WebSocket connections to monitor wallet changes and transaction events in real-time. When a tracked wallet executes a transaction, the system:

1. Detects the account change via Solana RPC
2. Parses the transaction to identify buy/sell type
3. Determines the protocol used (Jupiter/Raydium/Orca)
4. Stores the transaction in the database
5. Broadcasts updates to connected clients

### Protocol Detection
The system identifies which DEX protocol was used by analyzing:
- Program IDs in transaction instructions
- Token account changes
- Instruction data patterns

### Dashboard Analytics
Real-time metrics include:
- Buy vs Sell ratio
- Net market direction
- Most active wallets
- Protocol usage breakdown
- Historical trend analysis

## Configuration

### Environment Variables

**Backend (.env)**
```env
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/tokenwise
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
TARGET_TOKEN=9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump

# Optional
PORT=3001
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
```

**Frontend (.env)**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

### Database Configuration

The system uses PostgreSQL with the following key tables:
- `wallets` - Top token holders information
- `transactions` - Transaction history and analysis
- `analytics` - Cached insights and metrics

## Performance Optimization

- **Caching**: Redis for frequently accessed data
- **Database Indexing**: Optimized queries for real-time performance
- **Connection Pooling**: Efficient database connections
- **Rate Limiting**: Protects against API abuse
- **Data Pagination**: Efficient large dataset handling

## Troubleshooting

### Common Issues

**Backend won't start:**
```bash
# Check if PostgreSQL is running
sudo service postgresql status

# Check if port 3001 is available
lsof -i :3001
```

**Frontend build fails:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Database connection errors:**
```bash
# Test database connection
psql -h localhost -U your_username -d tokenwise
```

**Solana RPC issues:**
- Check if the RPC URL is accessible
- Consider using a premium RPC provider for better reliability
- Verify the token address is correct

## Sample Data

The system includes sample data generators for testing:

```bash
# Generate sample wallets
npm run seed:wallets

# Generate sample transactions
npm run seed:transactions

# Generate sample analytics
npm run seed:analytics
```

## Security Considerations

- API rate limiting implemented
- Input validation on all endpoints
- SQL injection prevention
- CORS configuration
- Environment variable protection


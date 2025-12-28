# 🎉 Eventify Backend

> A powerful, scalable event management backend built with NestJS, GraphQL, and MongoDB

[![NestJS](https://img.shields.io/badge/NestJS-11.1.9-E0234E?style=flat-square&logo=nestjs)](https://nestjs.com/)
[![GraphQL](https://img.shields.io/badge/GraphQL-16.12.0-E10098?style=flat-square&logo=graphql)](https://graphql.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.20.1-47A248?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Project](#-running-the-project)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Docker Deployment](#-docker-deployment)
- [Scripts](#-scripts)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### Core Functionality

- 🎫 **Event Management** - Create, update, and manage events with rich metadata
- 👥 **Group Management** - Organize events into groups and communities
- 👤 **Member System** - User authentication, profiles, and member management
- 💬 **Social Features** - Comments, likes, follows, and views tracking
- 🎟️ **Ticket System** - Event ticketing and registration management
- 📅 **Event Recurrence** - Support for recurring events with automatic generation
- 🔔 **Notifications** - Real-time notification system
- ❓ **FAQ System** - Frequently asked questions management

### Advanced Features

- 🤖 **Web Crawling** - Automated event scraping from external platforms (Meetup, Luma, etc.)
- 🧠 **AI Integration** - LLM support via Ollama for intelligent event processing
- 📤 **File Uploads** - Image uploads for events, groups, and members
- ⏰ **Batch Processing** - Scheduled tasks for recurring events, web crawling, and data processing
- 🔐 **Authentication** - JWT-based authentication with role-based access control
- 📊 **GraphQL API** - Flexible and efficient API with GraphQL playground

---

## 🛠 Tech Stack

### Core Framework

- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type-safe development
- **GraphQL** - Query language for APIs (Apollo Server)
- **MongoDB** - NoSQL database with Mongoose ODM

### Key Libraries

- **@nestjs/graphql** - GraphQL integration
- **@nestjs/jwt** - JWT authentication
- **@nestjs/schedule** - Task scheduling
- **agenda** - Job scheduling library
- **puppeteer** - Web scraping and automation
- **cheerio** - Server-side HTML parsing
- **multer** - File upload handling
- **bcryptjs** - Password hashing

### Development Tools

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Docker** - Containerization

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.x
- **pnpm** >= 8.x (or npm/yarn)
- **MongoDB** (local or cloud instance)
- **Docker** (optional, for containerized deployment)
- **Ollama** (optional, for AI features)

---

## 🚀 Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd eventify/backend
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

## ⚙️ Configuration

### Environment Files

The project supports two separate environments:

- **`.env`** - Production environment configuration
- **`.env.dev`** - Development environment configuration

**For Development:**

### Configuration Variables

**Development (`.env.dev`) example:**

```env
# Application Configuration
DOMAIN_NAME=http://localhost
NODE_ENV=development

# Ports
PORT_API=3007
PORT_BATCH=3008

# MongoDB Configuration - Development Database
MONGODB_URI=mongodb://admin:password@dev-server:27017/eventify?authSource=admin

# JWT Secret
SECRET_TOKEN=your-secret-token-here

# AI/LLM Configuration (Optional)
LLM_ENABLED=true
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=qwen2.5:0.5b
```

**Production (`.env`) example:**

```env
# Application Configuration
DOMAIN_NAME=https://eventify.azbek.me
NODE_ENV=production

# Ports
PORT_API=3007
PORT_BATCH=3008

# MongoDB Configuration - Production Database
MONGODB_URI=mongodb://admin:password@prod-server:27017/eventify?authSource=admin

# JWT Secret
SECRET_TOKEN=your-secure-production-token

# AI/LLM Configuration (Optional)
LLM_ENABLED=true
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=qwen2.5:0.5b
```

## 🐳 Docker Deployment

### Quick Start with Docker

**Development:**

```bash
./deploy_dev.sh
```

**Production:**

```bash
./deploy_prod.sh
```

### Ollama Setup (AI Features)

The Ollama service runs automatically as a Docker container. To pull the required model:

**1. Check if Ollama container is running:**

```bash
docker ps | grep ollama
```

**2. Pull the model (first time only):**

```bash
docker exec -it eventify-ollama-prod ollama pull qwen2.5:0.5b
```

**3. Verify the model is available:**

```bash
docker exec -it eventify-ollama-prod ollama list
```

**4. Test Ollama connection:**

```bash
docker exec -it eventify-batch-prod curl http://ollama:11434/api/version
```

You should see: `{"version":"x.x.x"}`

---

## 🏃 Running the Project

### Development Mode

**Run API server:**

```bash
pnpm run dev
```

**Run Batch server (in a separate terminal):**

```bash
pnpm run dev:batch
```

### Production Mode

**Build the project:**

```bash
pnpm run build
```

**Start API server:**

```bash
pnpm run start:prod
```

**Start Batch server:**

```bash
pnpm run start:prod:batch
```

### Access Points

- **GraphQL Playground**: `http://localhost:3007/graphql`
- **API Server**: `http://localhost:3007`
- **Batch Server**: `http://localhost:3008`
- **Static Files**: `http://localhost:3007/uploads/`

---

## 📁 Project Structure

```
backend/
├── apps/
│   ├── api/                    # Main API application
│   │   └── src/
│   │       ├── components/     # Feature modules
│   │       │   ├── auth/       # Authentication & authorization
│   │       │   ├── event/      # Event management
│   │       │   ├── group/      # Group management
│   │       │   ├── member/     # Member management
│   │       │   ├── comment/    # Comments system
│   │       │   ├── like/       # Like system
│   │       │   ├── follow/     # Follow system
│   │       │   ├── ticket/     # Ticket management
│   │       │   ├── notification/ # Notifications
│   │       │   ├── upload/     # File uploads
│   │       │   └── ...
│   │       ├── database/       # Database configuration
│   │       ├── libs/           # Shared utilities
│   │       ├── schemas/        # GraphQL schemas
│   │       └── main.ts         # Application entry point
│   │
│   └── batch/                  # Batch processing application
│       └── src/
│           ├── components/     # Batch job components
│           ├── agenda/         # Job scheduling
│           └── main.ts         # Batch server entry point
│
├── uploads/                    # Uploaded files
│   ├── event/                  # Event images
│   ├── group/                   # Group images
│   └── member/                 # Member avatars
│
├── package.json                # Dependencies
└── README.md                   # This file
```

---

## 📚 API Documentation

### GraphQL Playground

Once the server is running, access the GraphQL Playground at:

```
http://localhost:3007/graphql
```

The playground provides:

- Interactive query builder
- Schema documentation
- Query testing interface
- Request/response inspection

### Example Queries

**Get Events:**

```graphql
query GetEvents {
	events {
		id
		title
		description
		startDate
		endDate
		group {
			id
			name
		}
	}
}
```

**Create Event:**

```graphql
mutation CreateEvent($input: CreateEventInput!) {
	createEvent(input: $input) {
		id
		title
		description
	}
}
```

---

## 🐳 Docker Deployment

The project supports two separate deployment environments with dedicated scripts and configurations.

### Development Deployment

Deploy to development environment with MongoDB development server and hot-reload:

```bash
./deploy_dev.sh
```

This will:

- Use `.env.dev` configuration file
- Connect to MongoDB development server
- Run with `pnpm run dev` (hot-reload enabled)
- Start containers: `eventify-api-dev` and `eventify-batch-dev`

### Production Deployment

Deploy to production environment with MongoDB production server:

```bash
./deploy_prod.sh
```

This will:

- Use `.env` configuration file
- Connect to MongoDB production server
- Build and run with `pnpm run start:prod`
- Start containers: `eventify-api-prod` and `eventify-batch-prod`

### Manual Docker Commands

**Development:**

```bash
# Start
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Stop
docker compose -f docker-compose.dev.yml down
```

**Production:**

```bash
# Start
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Stop
docker compose -f docker-compose.prod.yml down
```

### Docker Services

**Development:**

- **eventify-api-dev** - API server with hot-reload (port 4001 → 3007)
- **eventify-batch-dev** - Batch server with hot-reload (port 4002 → 3008)

**Production:**

- **eventify-api-prod** - API server optimized build (port 4001 → 3007)
- **eventify-batch-prod** - Batch server optimized build (port 4002 → 3008)

Both environments use the `monorepo-network` bridge network for communication.

### Environment Differences

| Feature                 | Development                | Production                 |
| ----------------------- | -------------------------- | -------------------------- |
| **Database**            | MongoDB Development Server | MongoDB Production Server  |
| **Build Mode**          | Watch mode (hot-reload)    | Optimized production build |
| **Environment File**    | `.env.dev`                 | `.env`                     |
| **Docker Compose File** | `docker-compose.dev.yml`   | `docker-compose.prod.yml`  |
| **Container Names**     | `*-dev`                    | `*-prod`                   |
| **Run Command**         | `pnpm run dev`             | `pnpm run start:prod`      |

---

## 📜 Scripts

### Deployment Scripts

| Script             | Description                       |
| ------------------ | --------------------------------- |
| `./deploy_dev.sh`  | Deploy to development environment |
| `./deploy_prod.sh` | Deploy to production environment  |

### NPM Scripts

| Script                      | Description                           |
| --------------------------- | ------------------------------------- |
| `pnpm run build`            | Build both API and Batch applications |
| `pnpm run dev`              | Start API server in watch mode        |
| `pnpm run dev:batch`        | Start Batch server in watch mode      |
| `pnpm run start`            | Start API server                      |
| `pnpm run start:prod`       | Start API server in production mode   |
| `pnpm run start:prod:batch` | Start Batch server in production mode |
| `pnpm run start:debug`      | Start API server in debug mode        |
| `pnpm run lint`             | Run ESLint and fix issues             |
| `pnpm run format`           | Format code with Prettier             |

---

## 🔄 Batch Processing

The batch server handles scheduled tasks:

- **Recurring Events** - Automatically generates recurring event instances
- **Web Crawling** - Scrapes events from external platforms (Meetup, Luma, etc.)
- **Member Rollback** - Processes member data rollback operations
- **Top Organizers** - Calculates and updates top organizer rankings

All batch jobs are scheduled using cron expressions and can be configured in the batch service.

---

## 🔐 Authentication

The API uses JWT-based authentication:

1. **Login** - Obtain JWT token via GraphQL mutation
2. **Authorization** - Include token in request headers
3. **Role-Based Access** - Use `@Roles()` decorator for role-based endpoints

Example:

```graphql
mutation Login($email: String!, $password: String!) {
	login(email: $email, password: $password) {
		token
		member {
			id
			email
		}
	}
}
```

---

## 📤 File Uploads

File uploads are handled via REST endpoint:

- **Endpoint**: `POST /upload`
- **Supported Types**: Images (events, groups, members)
- **Storage**: Local filesystem (`uploads/` directory)
- **Access**: Files served at `/uploads/{type}/{filename}`

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow TypeScript best practices
- Use ESLint and Prettier configurations
- Write meaningful commit messages
- Add tests for new features

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- GraphQL powered by [Apollo Server](https://www.apollographql.com/)
- Database: [MongoDB](https://www.mongodb.com/)

---

<div align="center">

**Made with ❤️ for event management**

⭐ Star this repo if you find it helpful!

</div>

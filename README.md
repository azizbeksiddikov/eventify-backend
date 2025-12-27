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

3. **Set up environment variables**

   ```bash
   cp env.example .env
   ```

   Edit `.env` with your configuration (see [Configuration](#-configuration))

---

## ⚙️ Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Application Configuration
DOMAIN_NAME=http://localhost

# Ports
PORT_API=3007
PORT_BATCH=3008

# MongoDB Configuration
MONGO_DEV=mongodb://admin:password@localhost:27017/eventify_dev
MONGO_PROD=mongodb://admin:password@localhost:27017/eventify_prod

# JWT Secret
SECRET_TOKEN=your-secret-token-here

# AI/LLM Configuration (Optional)
LLM_ENABLED=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:0.5b
```

### Environment Variables Explained

| Variable          | Description                             | Required |
| ----------------- | --------------------------------------- | -------- |
| `DOMAIN_NAME`     | Base URL for the application            | ✅       |
| `PORT_API`        | Port for the API server                 | ✅       |
| `PORT_BATCH`      | Port for the batch server               | ✅       |
| `MONGO_DEV`       | MongoDB connection string (development) | ✅       |
| `MONGO_PROD`      | MongoDB connection string (production)  | ✅       |
| `SECRET_TOKEN`    | JWT secret key                          | ✅       |
| `LLM_ENABLED`     | Enable/disable AI features              | ❌       |
| `OLLAMA_BASE_URL` | Ollama server URL                       | ❌       |
| `OLLAMA_MODEL`    | Ollama model name                       | ❌       |

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
├── docker-compose.yml          # Docker configuration
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

### Using Docker Compose

1. **Build and start containers:**

   ```bash
   docker-compose up -d
   ```

2. **View logs:**

   ```bash
   docker-compose logs -f
   ```

3. **Stop containers:**
   ```bash
   docker-compose down
   ```

### Docker Services

- **eventify-api** - Main API server (port 4001 → 3007)
- **eventify-batch** - Batch processing server (port 4002 → 3008)

Both services use the `monorepo-network` bridge network for communication.

---

## 📜 Scripts

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

# 🎉 Eventify Backend

> A powerful, scalable event management backend built with NestJS, GraphQL, and MongoDB

[![NestJS](https://img.shields.io/badge/NestJS-11.1.9-E0234E?style=flat-square&logo=nestjs)](https://nestjs.com/)
[![GraphQL](https://img.shields.io/badge/GraphQL-16.12.0-E10098?style=flat-square&logo=graphql)](https://graphql.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.20.1-47A248?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Features](#-features)
- [Configuration](#-configuration)
- [Running the Project](#-running-the-project)
- [Docker Deployment](#-docker-deployment)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [License](#-license)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.x (includes npm)
- **MongoDB** (local or cloud instance)

### Get Started in 3 Steps

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create environment file**

   ```bash
   cp env.example .env.dev
   ```

   Edit `.env.dev` and set your MongoDB connection string.

3. **Start the API server**

   ```bash
   npm run dev
   ```

4. **Open GraphQL Playground**
   ```
   http://localhost:3007/graphql
   ```

That's it! You're ready to explore the API.

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
- 🧠 **AI Integration** - LLM (Ollama) for event crawling - filters & categorizes scraped events
- 📤 **File Uploads** - Image uploads for events, groups, and members
- ⏰ **Batch Processing** - Scheduled tasks for recurring events, web crawling, and data processing
- 🔐 **Authentication** - JWT-based authentication with role-based access control
- 📊 **GraphQL API** - Flexible and efficient API with GraphQL playground

---

---

## ⚙️ Configuration

### Environment Files

- **`.env.dev`** - Development (copy from `env.example`)
- **`.env`** - Production

### Required Variables

**Development (`.env.dev`):**

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
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=qwen2.5:0.5b
```

**Production (`.env`):**
Same structure, but with production values.

---

## 🏃 Running the Project

### Development

**API Server:**

```bash
npm run dev
```

Access at: `http://localhost:3007/graphql`

**Batch Server** (optional, for scheduled tasks):

```bash
npm run dev:batch
```

### Production

```bash
npm run build
npm run start:prod
npm run start:prod:batch  # In separate terminal
```

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

Access the interactive GraphQL Playground at `http://localhost:3007/graphql` once the server is running.

### Example Query

```graphql
query GetEvents {
	events {
		id
		title
		description
		startDate
		endDate
	}
}
```

---

## 🐳 Docker Deployment

### Quick Start

**Development:**

```bash
./deploy_dev.sh
```

**Production:**

```bash
./deploy_prod.sh
```

### Manual Commands

**Development:**

```bash
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml logs -f
```

**Production:**

```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f
```

---

## 📜 Available Scripts

| Command              | Description                   |
| -------------------- | ----------------------------- |
| `npm run dev`        | Start API server (watch mode) |
| `npm run dev:batch`  | Start Batch server (watch)    |
| `npm run build`      | Build for production          |
| `npm run start:prod` | Start API server (production) |
| `npm run lint`       | Run ESLint                    |

---

## 📝 License

This project is licensed under the MIT License.

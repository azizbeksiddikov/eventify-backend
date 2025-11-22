# Eventify API Module Development Patterns

## Module Structure

Each module follows this structure:

```
components/
  └── module-name/
      ├── module-name.module.ts    # Module definition
      ├── module-name.service.ts   # Business logic
      └── module-name.resolver.ts  # GraphQL endpoints (if needed)
```

## Module File Pattern

### 1. Module File (`*.module.ts`)

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// ===== Schemas =====
import ModuleSchema from '../../schemas/Module.schema';

// ===== Components =====
import { AuthModule } from '../auth/auth.module';
import { OtherModule } from '../other/other.module';

// ===== Module Components =====
import { ModuleResolver } from './module.resolver';
import { ModuleService } from './module.service';

@Module({
	imports: [
		MongooseModule.forFeature([{ name: 'Module', schema: ModuleSchema }]),
		AuthModule, // Usually required
		OtherModule, // If service depends on it
	],
	providers: [ModuleResolver, ModuleService],
	exports: [ModuleService], // Export if used by other modules
})
export class ModuleModule {}
```

**Key Points:**

- Import schemas from `../../schemas/`
- Import other modules from `../module-name/`
- Always include `AuthModule` if authentication needed
- Export service if used by other modules

### 2. Service File (`*.service.ts`)

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';

// ===== DTOs =====
import { ModuleInput } from '../../libs/dto/module/module.input';
import { Module } from '../../libs/dto/module/module';

// ===== Enums & Types =====
import { Message } from '../../libs/enums/common.enum';
import { T } from '../../libs/types/common';

// ===== Other Services =====
import { OtherService } from '../other/other.service';

@Injectable()
export class ModuleService {
	constructor(
		@InjectModel('Module') private readonly moduleModel: Model<Module>,
		private readonly otherService: OtherService, // Inject if needed
	) {}

	public async createModule(input: ModuleInput): Promise<Module> {
		try {
			const module = await this.moduleModel.create(input);
			return module;
		} catch (error) {
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}
}
```

**Key Points:**

- Use `@Injectable()` decorator
- Inject models with `@InjectModel('ModelName')`
- Inject other services in constructor
- Use try-catch for error handling
- Throw `BadRequestException` with `Message` enum

### 3. Resolver File (`*.resolver.ts`) - GraphQL

```typescript
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { ObjectId } from 'mongoose';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Module } from '../../libs/dto/module/module';
import { ModuleInput } from '../../libs/dto/module/module.input';
import { ModuleService } from './module.service';

@Resolver(() => Module)
export class ModuleResolver {
	constructor(private readonly moduleService: ModuleService) {}

	@UseGuards(AuthGuard)
	@Mutation(() => Module)
	public async createModule(@Args('input') input: ModuleInput, @AuthMember('_id') memberId: ObjectId): Promise<Module> {
		console.log('Mutation: createModule');
		return await this.moduleService.createModule(memberId, input);
	}

	@UseGuards(WithoutGuard) // For public endpoints
	@Query(() => Module)
	public async getModule(@Args('id') id: string): Promise<Module> {
		console.log('Query: getModule');
		return await this.moduleService.getModule(id);
	}
}
```

**Key Points:**

- Use `@Resolver(() => ReturnType)` decorator
- Use `@UseGuards(AuthGuard)` for protected endpoints
- Use `@AuthMember('_id')` to get authenticated member
- Use `@Roles()` + `RolesGuard` for role-based access
- Use `WithoutGuard` for public endpoints
- Log mutations/queries with `console.log`

### 4. Register in ComponentsModule

```typescript
// apps/api/src/components/components.module.ts
import { ModuleModule } from './module/module.module';

@Module({
	imports: [
		// ... other modules
		ModuleModule, // Add here
	],
})
export class ComponentsModule {}
```

## Import Patterns

### Schema Imports

```typescript
import ModuleSchema from '../../schemas/Module.schema';
```

### DTO Imports

```typescript
import { Module } from '../../libs/dto/module/module';
import { ModuleInput } from '../../libs/dto/module/module.input';
```

### Enum Imports

```typescript
import { Message, Direction } from '../../libs/enums/common.enum';
import { ModuleStatus } from '../../libs/enums/module.enum';
```

### Service Imports

```typescript
import { OtherService } from '../other/other.service';
```

### Config Imports

```typescript
import { lookupMember, shapeIntoMongoObjectId } from '../../libs/config';
```

## Common Patterns

### Error Handling

```typescript
try {
	const result = await this.model.create(input);
	return result;
} catch (error) {
	throw new BadRequestException(Message.CREATE_FAILED);
}
```

### ObjectId Conversion

```typescript
import { shapeIntoMongoObjectId } from '../../libs/config';
const targetId = shapeIntoMongoObjectId(id);
```

### Aggregation with Lookups

```typescript
import { lookupMember } from '../../libs/config';

const result = await this.model.aggregate([
	{ $match: match },
	{ $sort: sort },
	lookupMember, // Predefined lookup
	{ $unwind: '$memberData' },
]);
```

### Status Checks

```typescript
if (item.status === Status.DELETED) {
	throw new Error(Message.NOT_FOUND);
}
```

## Naming Conventions

- **Files**: `kebab-case` (e.g., `event.service.ts`)
- **Classes**: `PascalCase` (e.g., `EventService`)
- **Methods**: `camelCase` (e.g., `createEvent()`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `EVENT_STATUS`)
- **Enums**: `PascalCase` (e.g., `EventStatus`)

## Service Method Patterns

### Create Method

```typescript
public async createModule(memberId: ObjectId, input: ModuleInput): Promise<Module> {
  // Validation
  // Authorization check
  // Create entity
  // Update related stats
  // Return result
}
```

### Update Method

```typescript
public async updateModule(memberId: ObjectId, input: ModuleUpdateInput): Promise<Module> {
  // Find entity
  // Check authorization
  // Validate input
  // Update entity
  // Return result
}
```

### Get Method

```typescript
public async getModule(memberId: ObjectId | null, moduleId: ObjectId): Promise<Module> {
  // Find entity
  // Check if exists
  // Add aggregated data (if needed)
  // Return result
}
```

## Dependencies

- Always inject `AuthModule` if authentication needed
- Import other modules if service methods are used
- Export service if used by other modules
- Use `MongooseModule.forFeature()` for each schema

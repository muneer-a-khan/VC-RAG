# 🔷 Prisma ORM Guide

This project uses **Prisma** as the ORM for database operations. Prisma provides a modern, type-safe way to work with databases.

## Why Prisma?

- ✅ **Type Safety**: Auto-generated, fully typed database client
- ✅ **Intuitive Schema**: Easy-to-read schema definition language
- ✅ **Great DX**: Excellent developer experience with auto-completion
- ✅ **Prisma Studio**: Built-in database GUI
- ✅ **Migrations**: Simple migration workflow
- ✅ **Relations**: Easy handling of relationships
- ✅ **Async Support**: Native async/await with Python

## Schema Definition

The database schema is defined in `backend/prisma/schema.prisma`:

```prisma
model User {
  id             String   @id @default(uuid())
  email          String   @unique
  hashedPassword String   @map("hashed_password")
  fullName       String   @map("full_name")
  
  // Relations
  projects       Project[]
  chats          Chat[]
  
  @@map("users")
}
```

## Common Commands

### Generate Client
After any schema changes:
```bash
cd backend
prisma generate
```

### Push Schema to Database (Development)
Quick way to sync schema without migrations:
```bash
prisma db push
```

### Create Migration (Production)
Create a migration file:
```bash
prisma migrate dev --name add_new_field
```

### Apply Migrations
Deploy migrations to production:
```bash
prisma migrate deploy
```

### Prisma Studio
Open the database GUI:
```bash
prisma studio
```
Access at `http://localhost:5555`

### Reset Database
⚠️ Warning: This deletes all data!
```bash
prisma migrate reset
```

## Usage in Code

### Basic Queries

```python
from app.db.database import prisma

# Create
user = await prisma.user.create(
    data={
        "email": "user@example.com",
        "hashedPassword": "...",
        "fullName": "John Doe"
    }
)

# Find one
user = await prisma.user.find_unique(
    where={"email": "user@example.com"}
)

# Find many
users = await prisma.user.find_many(
    where={"isActive": True},
    order={"createdAt": "desc"},
    take=10
)

# Update
user = await prisma.user.update(
    where={"id": user_id},
    data={"fullName": "Jane Doe"}
)

# Delete
await prisma.user.delete(
    where={"id": user_id}
)
```

### Relations

```python
# Create with relations
project = await prisma.project.create(
    data={
        "name": "New Project",
        "userId": user.id,
        "documents": {
            "create": [
                {"filename": "doc1.pdf", "fileType": "pdf"}
            ]
        }
    }
)

# Query with relations
project = await prisma.project.find_unique(
    where={"id": project_id},
    include={
        "documents": True,
        "user": True,
        "chats": {
            "include": {"messages": True}
        }
    }
)

# Access related data
print(project.user.email)
print(len(project.documents))
```

### Filtering

```python
# Simple filter
users = await prisma.user.find_many(
    where={"organization": "Acme VC"}
)

# Complex filters
projects = await prisma.project.find_many(
    where={
        "AND": [
            {"userId": user_id},
            {"type": "portfolio_company"},
            {"createdAt": {"gte": start_date}}
        ]
    }
)

# Text search
messages = await prisma.message.find_many(
    where={
        "content": {
            "contains": "investment",
            "mode": "insensitive"
        }
    }
)
```

### Aggregations

```python
# Count
count = await prisma.project.count(
    where={"userId": user_id}
)

# Aggregate
result = await prisma.document.aggregate(
    where={"projectId": project_id},
    _sum={"fileSize": True},
    _count=True
)
```

## Schema Patterns

### Adding a New Model

1. Edit `backend/prisma/schema.prisma`:
```prisma
model NewModel {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now()) @map("created_at")
  
  @@map("new_models")
}
```

2. Generate client:
```bash
prisma generate
```

3. Push to database:
```bash
prisma db push
```

### Adding a Relation

```prisma
model Post {
  id       String @id @default(uuid())
  title    String
  authorId String @map("author_id")
  
  author User @relation(fields: [authorId], references: [id])
  
  @@map("posts")
}

model User {
  id    String @id @default(uuid())
  email String @unique
  
  posts Post[]
  
  @@map("users")
}
```

### Adding an Index

```prisma
model Project {
  id     String @id @default(uuid())
  userId String @map("user_id")
  name   String
  
  @@index([userId])
  @@index([name])
  @@map("projects")
}
```

## Best Practices

1. **Always run `prisma generate` after schema changes**
2. **Use `db push` for development, `migrate` for production**
3. **Add indexes on foreign keys and frequently queried fields**
4. **Use `@@map()` to customize table names**
5. **Use `@map()` to customize column names**
6. **Include relations explicitly when needed**
7. **Use transactions for multiple operations**

## Transactions

```python
# Execute multiple operations atomically
async def transfer_project(project_id: str, from_user_id: str, to_user_id: str):
    await prisma.$transaction([
        prisma.project.update(
            where={"id": project_id},
            data={"userId": to_user_id}
        ),
        prisma.notification.create(
            data={
                "userId": to_user_id,
                "message": f"Project transferred to you"
            }
        )
    ])
```

## Raw Queries

For complex queries or pgvector operations:

```python
# Raw SQL
result = await prisma.$query_raw(
    """
    SELECT * FROM vector_documents
    WHERE project_id = $1
    ORDER BY embedding <-> $2
    LIMIT 5
    """,
    project_id,
    query_embedding
)
```

## Troubleshooting

### Client Not Generated
```bash
prisma generate
```

### Schema Out of Sync
```bash
prisma db push
```

### Migration Issues
```bash
# Reset and reapply
prisma migrate reset
prisma migrate deploy
```

### Connection Issues
- Check `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Verify database exists

## Resources

- [Prisma Python Docs](https://prisma-client-py.readthedocs.io/)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Prisma Python GitHub](https://github.com/RobertCraigie/prisma-client-py)

---

**Happy querying with Prisma! 🔷**


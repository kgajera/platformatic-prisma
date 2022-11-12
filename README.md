# Platformatic Prisma

[![npm version](https://badge.fury.io/js/platformatic-prisma.svg)](https://www.npmjs.com/package/platformatic-prisma)

Remove the friction to create migrations for your [Platformatic DB](https://oss.platformatic.dev/docs/reference/db/introduction) by generating them using a [Prisma schema](https://www.prisma.io/docs/concepts/components/prisma-schema).

- Use Prisma schema to manage your data models
- Generate Platformatic compatible [migrations](https://oss.platformatic.dev/docs/reference/db/migrations) when changes are made to your Prisma schema
- Migrations will be [run](https://oss.platformatic.dev/docs/reference/db/migrations#how-to-run-migrations) by Platformatic

## Installation

Install `platformatic-prisma` and `prisma`:

```
npm install prisma platformatic-prisma -D
```

Create a `./prisma/schema.prisma` file with the following contents:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Table used by Platformatic/Postgrator to manage migrations
model Version {
  version BigInt    @id
  name    String?
  md5     String?
  run_at  DateTime? @db.Timestamptz(6)

  @@map("versions")
  @@ignore
}
```

## Generating Migrations

When changes are made to your `schema.prisma` file, run `npx platformatic-prisma` to generate migrations. This will generate a migration file in the migrations directory that is specified in your Platformatic [configuration file](https://oss.platformatic.dev/docs/reference/db/configuration#configuration-file).

To run migrations, refer to [Platformatic's documentation](https://oss.platformatic.dev/docs/reference/db/migrations).

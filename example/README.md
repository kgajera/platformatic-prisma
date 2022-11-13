# Platformatic Prisma Example Project

## Getting Started

1. Set the `DATABASE_URL` environment variable in [`.env`](/example/.env) with the connection string to connect to your database. The [`prisma/schema.prisma`](/example/prisma/schema.prisma#L5) file is configured to connect to a Postgres database.
1. Run `npm install` to install dependencies.

## Starting the API Server

Run `npm start` to start the Platformatic DB API server.

## Generating Migrations

Run `npm run migrate` to generate a migration file. Run this when you make changes to the [`prisma/schema.prisma`](/example/prisma/schema.prisma) file.

## Running Migrations

Migrations are automatically applied when starting the API server as configured in the [`platformatic.db.json`](/example/platformatic.db.json#L12) file.

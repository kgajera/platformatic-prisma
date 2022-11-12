#!/usr/bin/env node

import loadConfig from "@platformatic/db/lib/load-config.mjs";
import chalk from "chalk";
import { execaCommand } from "execa";
import fs from "fs";
import path from "path";

const PRISMA_SCHEMA_PATH = path.resolve("prisma", "schema.prisma");

try {
  const args = process.argv.slice(2);
  const description = args[0] ?? "";

  const { stdout } = await execaCommand(
    `npx prisma migrate diff  --from-schema-datasource ${PRISMA_SCHEMA_PATH} --to-schema-datamodel ${PRISMA_SCHEMA_PATH} --script`
  );

  if (stdout.trim() === "-- This is an empty migration.") {
    console.log(chalk.green("No migrations are needed"));
  } else {
    const {
      configManager: { current },
    } = await loadConfig({}, "");

    const migrationsDir = current.migrations?.dir;

    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory does not exist: ${migrationsDir}`);
    }

    const migrations = fs.readdirSync(migrationsDir);
    const migrationNumber = migrations.length
      ? Number(migrations[migrations.length - 1].split(".")[0]) + 1
      : 1;

    const padding =
      migrationNumber < 10 ? "00" : migrationNumber < 100 ? "0" : "";

    const migrationPath = path.resolve(
      migrationsDir,
      `${padding}${migrationNumber}.do.${description?.length ? `${description}.` : ""
      }sql`
    );

    fs.writeFileSync(migrationPath, stdout);

    console.log(
      `${chalk.green("Generated migration file:")} ${chalk.underline(
        migrationPath
      )}`
    );
  }
} catch (error) {
  console.log(chalk.red(error.message));
  process.exitCode = 1;
}

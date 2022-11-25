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

  // Creates migration script
  const upMigration = await execaCommand(
    `npx prisma migrate diff  --from-schema-datasource ${PRISMA_SCHEMA_PATH} --to-schema-datamodel ${PRISMA_SCHEMA_PATH} --script`
  );

  if (upMigration.stdout.trim() === "-- This is an empty migration.") {
    console.log(chalk.green("No migrations are needed"));
  } else {
    const migrationsDir = await getMigrationsDir();
    const nextMigrationVersion = await getNextMigrationVersion(migrationsDir);

    const writeMigrationFile = async (content, action = "do") => {
      const migrationFilename = getMigrationFilename(nextMigrationVersion, action, description);
      const migrationPath = path.resolve(migrationsDir, migrationFilename);
      await fs.promises.writeFile(migrationPath, content);
      return migrationPath;
    }

    // Save the "do" migration file
    const migrationDoPath = await writeMigrationFile(upMigration.stdout);

    // Creates "undo" migration script
    const downMigration = await execaCommand(
      `npx prisma migrate diff  --from-schema-datamodel ${PRISMA_SCHEMA_PATH} --to-schema-datasource ${PRISMA_SCHEMA_PATH} --script`
    );

    // Save the "undo" migration file
    const migrationUndoPath = await writeMigrationFile(downMigration.stdout, "undo");

    console.log(chalk.green("Generated migration files:"));
    console.log(`\t${chalk.underline(migrationDoPath)}`);
    console.log(`\t${chalk.underline(migrationUndoPath)}`);
  }
} catch (error) {
  console.log(chalk.red(error.message));
  process.exitCode = 1;
}

/**
 * Returns `migrations.dir` value from the Platformatic DB configuration file
 */
async function getMigrationsDir() {
  const { configManager: { current } } = await loadConfig({}, "");
  const migrationsDir = current.migrations?.dir;

  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory does not exist: ${migrationsDir}`);
  }

  return migrationsDir;
}

/**
 * Returns a valid Postgrator migration filename
 * https://github.com/rickbergfalk/postgrator#usage
 */
function getMigrationFilename(version, action = "do", description = "") {
  return `${version}.${action}.${description?.length ? `${description}.` : ""}sql`;
}

/**
 * Returns the the next migration version number
 */
async function getNextMigrationVersion(migrationsDir) {
  const migrations = await fs.promises.readdir(migrationsDir);
  const sortedMigrations = migrations
    .filter((file) => path.extname(file) === ".sql")
    .sort();

  const versionNumber = sortedMigrations.length
    ? Number(sortedMigrations[sortedMigrations.length - 1].split(".")[0]) + 1
    : 1;

  return versionNumber.toString().padStart(3, "0");
}

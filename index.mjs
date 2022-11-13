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
    const migrationsDir = await getMigrationsDir();
    const nextMigrationVersion = await getNextMigrationVersion(migrationsDir);
    const migrationFilename = getMigrationFilename(nextMigrationVersion, description);
    const migrationPath = path.resolve(migrationsDir, migrationFilename);

    await fs.promises.writeFile(migrationPath, stdout);

    console.log(
      `${chalk.green("Generated migration file:")} ${chalk.underline(migrationPath)}`
    );
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
function getMigrationFilename(version, description = "") {
  return `${version}.do.${description?.length ? `${description}.` : ""}sql`;
}

/**
 * Returns the the next migration version number
 */
async function getNextMigrationVersion(migrationsDir) {
  const migrations = await fs.promises.readdir(migrationsDir)
  const sortedMigrations = migrations.filter(file => path.extname(file) === ".sql").sort();

  const versionNumber = sortedMigrations.length
    ? Number(sortedMigrations[sortedMigrations.length - 1].split(".")[0]) + 1
    : 1;

  return versionNumber.toString().padStart(3, "0");
}

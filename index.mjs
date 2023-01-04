#!/usr/bin/env node

import loadConfig from "@platformatic/db/lib/load-config.mjs";
import chalk from "chalk";
import { execaCommand } from "execa";
import fs from "fs";
import path from "path";
import parser from "yargs-parser";

try {
  const argv = parser(process.argv.slice(2), {
    boolean: ["down", "up"],
    default: {
      description: "",
      down: true,
      schema: path.resolve("prisma", "schema.prisma"),
      up: true,
    },
  });

  // Create migration scripts
  const [upMigration, downMigration] = await Promise.all([
    execaCommand(
      `npx prisma migrate diff  --from-schema-datasource ${argv.schema} --to-schema-datamodel ${argv.schema} --script`
    ),
    argv.down
      ? execaCommand(
          `npx prisma migrate diff  --from-schema-datamodel ${argv.schema} --to-schema-datasource ${argv.schema} --script`
        )
      : Promise.resolve(null),
  ]);

  if (upMigration.stdout.trim() === "-- This is an empty migration.") {
    console.log(chalk.green("No migrations are needed"));
  } else {
    const migrationsDir = await getMigrationsDir();
    const nextMigrationVersion = await getNextMigrationVersion(migrationsDir);

    const writeMigrationFile = async (content, action = "do") => {
      const migrationFilename = getMigrationFilename(
        nextMigrationVersion,
        action,
        argv.description
      );
      const migrationPath = path.resolve(migrationsDir, migrationFilename);
      await fs.promises.writeFile(migrationPath, content);
      console.log(`\t${chalk.underline(migrationPath)}`);
    };

    console.log(chalk.green("Generated migration files:"));

    // Save migration files
    await Promise.all([
      argv.up ? writeMigrationFile(upMigration.stdout) : Promise.resolve(null),
      argv.down
        ? writeMigrationFile(downMigration.stdout, "undo")
        : Promise.resolve(null),
    ]);
  }
} catch (error) {
  console.log(chalk.red(error.message));
  process.exitCode = 1;
}

/**
 * Returns `migrations.dir` value from the Platformatic DB configuration file
 */
async function getMigrationsDir() {
  const {
    configManager: { current },
  } = await loadConfig({}, "");
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
  return `${version}.${action}.${
    description?.length ? `${description}.` : ""
  }sql`;
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

#!/usr/bin/env node

import { loadConfig } from "@platformatic/config";
import { platformaticDB } from "@platformatic/db";
import { Migrator } from "@platformatic/db/lib/migrator.mjs";
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
    const { configManager } = await loadConfig({}, "", platformaticDB);
    const config = configManager.current;

    if (config.migrations === undefined) {
      throw new Error(
        'Missing "migrations" property in your Platformatic configuration file'
      );
    }

    const migrator = new Migrator(config.migrations, config.db, {
      ...console,
      debug: () => undefined,
      trace: () => undefined,
    });

    await migrator.checkMigrationsDirectoryExists();

    const nextMigrationVersion = await migrator.getNextMigrationVersion();
    const nextMigrationVersionStr =
      migrator.convertVersionToStr(nextMigrationVersion);

    const writeMigrationFile = async (content, action = "do") => {
      const migrationFilename = getMigrationFilename(
        nextMigrationVersionStr,
        action,
        argv.description
      );
      const migrationPath = path.resolve(
        migrator.migrationDir,
        migrationFilename
      );
      await fs.promises.writeFile(migrationPath, content);
      console.log(`\t${chalk.underline(migrationPath)}`);
    };

    console.log(chalk.green("Generated migration files:"));

    // Save migration files
    await Promise.all([
      migrator.close(),
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
 * Returns a valid Postgrator migration filename
 * https://github.com/rickbergfalk/postgrator#usage
 */
function getMigrationFilename(version, action = "do", description = "") {
  return `${version}.${action}.${
    description?.length ? `${description}.` : ""
  }sql`;
}

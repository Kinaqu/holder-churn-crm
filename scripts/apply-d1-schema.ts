import { readFileSync } from "node:fs";
import { join } from "node:path";
import { d1Query } from "../src/lib/db/d1-client";

const schema = readFileSync(join(process.cwd(), "src/lib/db/schema.sql"), "utf8");
const statements = schema
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);

for (const statement of statements) {
  await d1Query(`${statement};`);
}

console.log(`Applied ${statements.length} D1 schema statements.`);

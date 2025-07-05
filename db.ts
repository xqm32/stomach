import { DuckDBInstance, VARCHAR } from "@duckdb/node-api";

const instance = await DuckDBInstance.create("./db/stomach.duckdb");
const connection = await instance.connect();

async function subsInYear(year: number) {
  const result = await connection.run(
    "SELECT EndDate, RalatedParty, Symbol FROM subs WHERE RelationshipCode = 'P7502' AND starts_with(EndDate, $year)",
    { year: year.toString() },
    { year: VARCHAR }
  );
  return await result.getRowsJson();
}

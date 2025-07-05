import { DuckDBInstance, VARCHAR } from "@duckdb/node-api";

const instance = await DuckDBInstance.create("./db/stomach.duckdb");
const connection = await instance.connect();

export async function subsInYear(year: number) {
  const result = await connection.run(
    "SELECT EndDate as year, RalatedParty as name, Symbol as code FROM subs WHERE RelationshipCode = 'P7502' AND starts_with(EndDate, $year)",
    { year: year.toString() },
    { year: VARCHAR }
  );
  return (await result.getRowObjectsJson()) as {
    year: string;
    name: string;
    code: string;
  }[];
}

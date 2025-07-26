import { DOUBLE, DuckDBInstance, VARCHAR } from "@duckdb/node-api";
import { v7 } from "uuid";

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

export async function loadReceivables(year: number) {
  const data = await Bun.file(`receivables/${year}-receivables.json`).json();
  for (const item of data) {
    const [year, part2] = item.filePath.split("/");
    const [code] = part2.split("_");
    if (!item.hasTopReceivables) continue;
    const { topReceivables } = item;
    if (!topReceivables?.hasTopReceivables) continue;
    const subs = topReceivables.topReceivables;
    for (const sub of subs) {
      try {
        await connection.run(
          "INSERT INTO receivables (id, year, code, isMasked, endingBalance, percentageOfTotal, debtorName) VALUES ($id, $year, $code, $isMasked, $endingBalance, $percentageOfTotal, $debtorName)",
          {
            id: v7(),
            year,
            code,
            isMasked: sub.isMasked,
            endingBalance: sub.endingBalance,
            percentageOfTotal: sub.percentageOfTotal,
            debtorName: sub.debtorName,
          }
        );
      } catch (error) {
        console.error(`Error inserting receivable for ${year}-${code}:`, error);
      }
    }
  }
}

// await connection.run(`
// DROP TABLE IF EXISTS receivables;
// CREATE TABLE receivables (
//     id VARCHAR PRIMARY KEY,

//     year INTEGER,
//     code VARCHAR,
//     isMasked BOOLEAN,
//     endingBalance DOUBLE,
//     percentageOfTotal DOUBLE,
//     debtorName VARCHAR,

//     parentCode VARCHAR,
//     scoreName VARCHAR,
//     score DOUBLE,
// );`);

// for (let year = 2012; year <= 2023; year++) {
//   console.log(`Loading receivables for year ${year}...`);
//   await loadReceivables(year);
//   console.log(`Finished loading receivables for year ${year}`);
// }

await loadReceivables(2020);

import { DOUBLE, DuckDBInstance, VARCHAR } from "@duckdb/node-api";
import { searchYear } from "./search";

const instance = await DuckDBInstance.create("./db/stomach.duckdb");
const connection = await instance.connect();

async function selectInYear(year: number) {
  const selecting = await connection.run(
    "SELECT * FROM receivables WHERE year = $year AND isMasked = false",
    {
      year: year.toString(),
    }
  );
  return await selecting.getRowObjectsJson();
}

async function finishYear(year: number) {
  const data = (await selectInYear(year)) as any;

  for (const [index, item] of Array.from(data).entries()) {
    try {
      console.log(
        `Processing ${index + 1}/${data.length} for year ${year}:`,
        item.debtorName
      );
      const result = (await searchYear(item.debtorName, year)) as any;
      console.log(`Found result for ${item.debtorName}:`, result);
      await connection.run(
        `UPDATE receivables SET parentCode = $code, score = $score, scoreName = $scoreName WHERE id = $id`,
        {
          code: result.code,
          score: result.score,
          scoreName: result.name,
          id: item.id,
        }
      );
    } catch (error) {
      console.log(
        `Error processing ${index + 1}/${data.length} for year ${year}:`,
        error
      );
    }
  }
}

// await finishYear(2020);

for (const year of [
  2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2021, 2022,
]) {
  await finishYear(year);
}

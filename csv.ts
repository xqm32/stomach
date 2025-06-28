const csv = await Bun.file("origin/sub.csv").text();

const json = csv
  .split("\n")
  .slice(1)
  .map((line) => line.trim())
  .filter((line) => line.length > 0)
  .map((line) => {
    const [code, _, name] = line.split(",");

    if (!code || !name) {
      console.warn(`Skipping invalid line: ${line}`);
      return null;
    }

    return {
      code: code.trim().padStart(6, "0"),
      name: name.trim(),
    };
  });

await Bun.write("origin/sub.json", JSON.stringify(json, null, 2));

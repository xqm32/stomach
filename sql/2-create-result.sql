DROP TABLE IF EXISTS receivables;
CREATE TABLE receivables (
    id VARCHAR PRIMARY KEY,

    year INTEGER,
    code VARCHAR,
    isMasked BOOLEAN,
    endingBalance DOUBLE,
    percentageOfTotal DOUBLE,
    debtorName VARCHAR,

    filePath VARCHAR,
    parentCode VARCHAR,
    score DOUBLE,
);

ALTER TABLE receivables ADD COLUMN IF NOT EXISTS scoreName VARCHAR;
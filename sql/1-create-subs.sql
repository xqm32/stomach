-- Create subs table
CREATE TABLE subs AS
SELECT * FROM read_xlsx('step2/STK_NotesSubJoint.xlsx')
UNION ALL
SELECT * FROM read_xlsx('step2/STK_NotesSubJoint1.xlsx');
-- An audit with no recorded agent actions has no evidence to grade; its
-- report score is NULL ("insufficient evidence") instead of a fake number.
ALTER TABLE "UXReport" ALTER COLUMN "score" DROP NOT NULL;

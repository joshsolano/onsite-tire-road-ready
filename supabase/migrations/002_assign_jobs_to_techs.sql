-- Distribute completed/sent jobs evenly across active technicians per company.
-- Run this once in Supabase SQL Editor.

WITH techs AS (
  SELECT
    id,
    company_id,
    ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at) - 1 AS rn
  FROM users
  WHERE role = 'technician' AND is_active = true
),
tech_counts AS (
  SELECT company_id, COUNT(*) AS cnt FROM techs GROUP BY company_id
),
numbered_jobs AS (
  SELECT
    j.id,
    j.company_id,
    ROW_NUMBER() OVER (PARTITION BY j.company_id ORDER BY j.created_at) - 1 AS rn
  FROM jobs j
  WHERE j.status IN ('completed', 'report_generated', 'report_sent')
    AND j.assigned_tech_id IS NULL
)
UPDATE jobs
SET assigned_tech_id = (
  SELECT t.id
  FROM techs t
  JOIN tech_counts tc ON t.company_id = tc.company_id
  WHERE t.company_id = nj.company_id
    AND t.rn = nj.rn % tc.cnt
  LIMIT 1
)
FROM numbered_jobs nj
WHERE jobs.id = nj.id;

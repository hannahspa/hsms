-- TEST: Tao 1 function don gian de xac nhan SQL Editor hoat dong
-- Chay rieng file nay TRUOC, neu OK moi chay file tiep theo

CREATE OR REPLACE FUNCTION test_hello()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'Hello from PostgreSQL!';
$$;

-- Verify
SELECT test_hello();

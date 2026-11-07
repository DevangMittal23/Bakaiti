-- Derive searchable hashtags from the canonical posts table, respecting its RLS.
-- No legacy hashtags/post_hashtags tables or duplicated counters are needed.
CREATE OR REPLACE FUNCTION public.search_post_hashtags(search_query text DEFAULT '', result_limit integer DEFAULT 20)
RETURNS TABLE (id text, name text, usage_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT tag.name AS id, tag.name, count(DISTINCT p.id) AS usage_count
  FROM public.posts p
  CROSS JOIN LATERAL (
    SELECT lower(matches[1]) AS name
    FROM regexp_matches(coalesce(p.content, ''), '#([[:alnum:]_]+)', 'g') AS matches
  ) tag
  WHERE position(lower(ltrim(btrim(coalesce(search_query, '')), '#')) IN tag.name) > 0
  GROUP BY tag.name
  ORDER BY usage_count DESC, tag.name
  LIMIT greatest(1, least(coalesce(result_limit, 20), 50));
$$;

REVOKE EXECUTE ON FUNCTION public.search_post_hashtags(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_post_hashtags(text, integer) TO anon, authenticated, service_role;

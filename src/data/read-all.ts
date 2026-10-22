// max_rows in supabase/config.toml: the API never returns more rows per request, and truncates silently.
const PAGE = 1000;

// Every row, page by page. Each page must be ordered by a column the table has, or the pages could overlap.
export async function readAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error || !data) throw error ?? new Error("Missing rows");
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

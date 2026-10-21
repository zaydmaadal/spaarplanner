// A stand-in for the Supabase client in action and loader tests: it records every chained call made on
// from(table) and resolves the chain with whatever the handler returns for that call.
export type Call = { table: string; ops: Array<[op: string, args: unknown[]]> };
type Result = { data?: unknown; error?: { code?: string; message?: string } | null };

export function fakeDb(handler: (call: Call) => Result | void) {
  const calls: Call[] = [];
  const from = (table: string) => {
    const call: Call = { table, ops: [] };
    calls.push(call);
    const chain: object = new Proxy(
      {},
      {
        get: (_target, op: string) =>
          op === "then"
            ? (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
                Promise.resolve({ data: null, error: null, ...handler(call) }).then(resolve, reject)
            : (...args: unknown[]) => {
                call.ops.push([op, args]);
                return chain;
              },
      },
    );
    return chain;
  };
  return { client: { from }, calls };
}

// The arguments of the first chained call with this name, e.g. args(call, "upsert").
export const args = (call: Call, op: string) => call.ops.find(([name]) => name === op)?.[1];
export const has = (call: Call, op: string) => call.ops.some(([name]) => name === op);

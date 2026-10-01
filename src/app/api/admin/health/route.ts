import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { checkDatabaseConnection } from "@/lib/db";

export const dynamic = "force-dynamic";

const mb = (bytes: number) => Math.round(bytes / 1024 / 1024);

/** Admin-only server health: memory, uptime and database reachability, for diagnosing slowdowns. */
export async function GET() {
  await requireAdmin();
  const memory = process.memoryUsage();
  const started = Date.now();
  const database = await checkDatabaseConnection();
  return NextResponse.json(
    {
      uptimeMinutes: Math.round(process.uptime() / 60),
      memoryMb: { rss: mb(memory.rss), heapUsed: mb(memory.heapUsed), heapTotal: mb(memory.heapTotal), external: mb(memory.external), arrayBuffers: mb(memory.arrayBuffers) },
      database: { ...database, pingMs: Date.now() - started },
      node: process.version,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

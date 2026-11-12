import { isStored, loadState, resetState, saveState } from "../../lib/server/state";

export const dynamic = "force-dynamic";

const fail = (e: unknown) => Response.json({ error: e instanceof Error ? e.message : "Database error" }, { status: 500 });

/** The saved demo data, seeded on first use. */
export async function GET() {
  try {
    return Response.json(await loadState());
  } catch (e) {
    return fail(e);
  }
}

/** Replace the saved data with what the screens now show. */
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (!isStored(body)) return Response.json({ error: "Not a valid state" }, { status: 400 });
    await saveState(body);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

/** Put the sample data back. For starting a demo again. */
export async function DELETE() {
  try {
    return Response.json({ state: await resetState() });
  } catch (e) {
    return fail(e);
  }
}

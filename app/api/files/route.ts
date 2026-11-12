import { MAX_BYTES, files, safeName, validFolder, validKey } from "../../lib/server/files";

export const dynamic = "force-dynamic";

const fail = (e: unknown, status = 500) => Response.json({ error: e instanceof Error ? e.message : String(e) }, { status });

/** ?folder=designs/D-118 lists the files. ?key=... returns a short-lived download link. */
export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams;
    const key = q.get("key");
    if (key) {
      if (!validKey(key)) return fail("Bad key", 400);
      return Response.json({ url: await files().url(key, { expiresIn: 300 }) });
    }
    const folder = q.get("folder") ?? "";
    if (!validFolder(folder)) return fail("Bad folder", 400);
    const { items } = await files().list({ prefix: folder + "/", limit: 100 });
    return Response.json({
      files: items.map((f) => ({ key: f.key, name: f.key.split("/").pop()!.replace(/^[a-z0-9]+-/, ""), size: f.size, at: f.lastModified })),
    });
  } catch (e) {
    return fail(e);
  }
}

/** multipart: folder + file. */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const folder = String(form.get("folder") ?? "");
    const file = form.get("file");
    if (!validFolder(folder)) return fail("Bad folder", 400);
    if (!(file instanceof File) || !file.size) return fail("No file", 400);
    if (file.size > MAX_BYTES) return fail("File is over 10 MB", 413);
    const key = `${folder}/${Date.now().toString(36)}-${safeName(file.name)}`;
    await files().upload(key, file, { contentType: file.type || "application/octet-stream" });
    return Response.json({ key, size: file.size });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const key = new URL(req.url).searchParams.get("key") ?? "";
    if (!validKey(key)) return fail("Bad key", 400);
    await files().delete(key);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

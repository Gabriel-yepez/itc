import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  const secret = request.headers.get("x-revalidate-secret");
  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ revalidated: false }, { status: 401 });
  }
  revalidateTag("cms", "hourly"); // todas las consultas llevan también este tag
  return Response.json({ revalidated: true, now: Date.now() });
}

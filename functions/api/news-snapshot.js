const SNAPSHOT_OBJECT_KEY = "newsfeed/cloudflare-news-snapshot.json";

export async function onRequestGet({ env }) {
  const bucket = env.NEWS_SNAPSHOT_BUCKET;
  if (!bucket) {
    return Response.json({ error: "News snapshot storage is not configured" }, { status: 503 });
  }

  try {
    const object = await bucket.get(SNAPSHOT_OBJECT_KEY);
    if (!object) {
      return Response.json({ error: "News snapshot is not available yet" }, { status: 503 });
    }

    return new Response(object.body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=240",
        "ETag": object.httpEtag
      }
    });
  } catch (error) {
    console.error("Could not read the news snapshot from R2:", error);
    return Response.json({ error: "News snapshot is temporarily unavailable" }, { status: 502 });
  }
}

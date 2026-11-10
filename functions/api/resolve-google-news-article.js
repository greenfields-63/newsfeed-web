export async function onRequestGet({ request }) {
  const requestUrl = new URL(request.url);
  const rawArticleUrl = requestUrl.searchParams.get("url");

  let articleUrl;
  try {
    articleUrl = new URL(rawArticleUrl);
  } catch {
    return Response.json({ error: "Invalid article URL" }, { status: 400 });
  }

  if (
    articleUrl.protocol !== "https:" ||
    articleUrl.hostname !== "news.google.com" ||
    !/^\/(?:rss\/)?articles\//.test(articleUrl.pathname)
  ) {
    return Response.json({ error: "Only Google News article URLs are allowed" }, { status: 400 });
  }

  try {
    const response = await fetch(articleUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Newsfeed/1.0)",
        Accept: "text/html,application/xhtml+xml"
      }
    });
    const resolvedUrl = new URL(response.url);

    if (
      !response.ok ||
      !["http:", "https:"].includes(resolvedUrl.protocol) ||
      resolvedUrl.hostname === "news.google.com" ||
      resolvedUrl.hostname === "google.com" ||
      resolvedUrl.hostname.endsWith(".google.com")
    ) {
      return Response.json({ error: "Google News did not redirect to a publisher article" }, { status: 502 });
    }

    return Response.json(
      { url: resolvedUrl.href },
      { headers: { "Cache-Control": "public, max-age=1800" } }
    );
  } catch (error) {
    console.error("Could not resolve Google News article URL:", error);
    return Response.json({ error: "Could not resolve Google News article URL" }, { status: 502 });
  }
}

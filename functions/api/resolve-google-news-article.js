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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
    let resolvedUrl = new URL(response.url);

    if (resolvedUrl.hostname.endsWith("google.com")) {
      const html = await response.text();
      const match = html.match(/data-n-au="([^"]+)"/) ||
        html.match(/<a\b[^>]*data-n-a-u="([^"]+)"/i) ||
        html.match(/c-wiz[^>]*<a\b[^>]*href="([^"]+)"/i);
      if (match) {
        try {
          const parsed = new URL(match[1]);
          if (["http:", "https:"].includes(parsed.protocol) && !parsed.hostname.endsWith("google.com")) {
            resolvedUrl = parsed;
          }
        } catch {}
      }
    }

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

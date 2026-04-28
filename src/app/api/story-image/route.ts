import { NextResponse } from "next/server";

const STORY_SOURCE_URL =
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=80";

export async function GET() {
  try {
    const upstream = await fetch(STORY_SOURCE_URL, {
      next: { revalidate: 3600 },
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, error: "Unable to load story image." },
        { status: 502 }
      );
    }

    const bytes = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") || "image/jpeg";

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control":
          "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to load story image." },
      { status: 500 }
    );
  }
}

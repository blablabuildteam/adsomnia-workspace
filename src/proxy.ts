import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Lets server layouts remember the URL a signed-out visitor asked for. */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(
    "x-pathname",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logos/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)",
  ],
};

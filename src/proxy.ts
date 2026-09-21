import { type NextRequest, NextResponse } from 'next/server'

// Auth is handled client-side via sessionStorage.
// Proxy just passes requests through without modification.
export function proxy(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

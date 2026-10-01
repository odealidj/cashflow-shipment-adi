import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Tetap tampilkan antarmuka web browser standar (tidak otomatis redirect ke PWA /m di smartphone)
  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};

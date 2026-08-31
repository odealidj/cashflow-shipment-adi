import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If mobile device visits root '/', redirect to mobile PWA '/m'
  if (pathname === '/') {
    const userAgent = request.headers.get('user-agent') || '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    if (isMobile) {
      return NextResponse.redirect(new URL('/m', request.url));
    }
    // For desktop, stay on '/' (LoginPage)
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};

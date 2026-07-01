import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { routing } from './i18n/routing';

const handleIntl = createIntlMiddleware(routing);

// 로그인 필요한 앱 섹션
const APP_SECTIONS = [
  'dashboard', 'students', 'classes', 'pricing', 'salaries',
  'absences', 'holidays', 'invoices', 'payslips', 'admins',
];

export async function middleware(request: NextRequest) {
  // 1) i18n 라우팅 처리 (locale 리다이렉트/리라이트 포함)
  const response = handleIntl(request);

  // 2) Supabase 세션 갱신 (쿠키를 response에 반영)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet: { name: string; value: string; options?: CookieOptions }[]) =>
          toSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)),
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();

  // 3) 라우트 보호
  const seg = request.nextUrl.pathname.split('/'); // ['', locale, section, ...]
  const locale = routing.locales.includes(seg[1] as any) ? seg[1] : routing.defaultLocale;
  const section = seg[2] ?? '';

  if (!user && APP_SECTIONS.includes(section)) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }
  if (user && section === 'login') {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }
  return response;
}

export const config = { matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'] };

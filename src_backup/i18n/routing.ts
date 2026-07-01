import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['en', 'ko', 'zh'],   // 요구사항 1: 영어/한국어/중국어
  defaultLocale: 'ko',
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);

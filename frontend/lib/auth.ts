type CookieStore = {
  get: (name: string) => { value?: string } | undefined
}

export const DEFAULT_AUTH_COOKIE =
  process.env.AUTH_COOKIE_NAME ??
  process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME ??
  'codepilot_session'

const FALLBACK_COOKIE_NAMES = [
  DEFAULT_AUTH_COOKIE,
  'session',
  'token',
  'jwt',
  'codepilot_token',
  'codepilot_jwt',
]

export function hasAuthCookie(store: CookieStore): boolean {
  return FALLBACK_COOKIE_NAMES.some((name) => Boolean(store.get(name)?.value))
}

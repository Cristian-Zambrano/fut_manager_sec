import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  try {
    console.log('🔄 Middleware: Checking session for path:', request.nextUrl.pathname)
    
    // Refresh session if expired - required for Server Components
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('❌ Middleware: Session error:', error)
    } else {
      console.log('👤 Middleware: Session user:', session?.user?.id || 'No session')
    }

    // Protected routes
    const protectedPaths = ['/dashboard', '/teams', '/players', '/sanctions']
    const authPaths = ['/login', '/register']
    
    const isProtectedPath = protectedPaths.some(path => 
      request.nextUrl.pathname.startsWith(path)
    )
    const isAuthPath = authPaths.some(path => 
      request.nextUrl.pathname.startsWith(path)
    )

    // Redirect to login if accessing protected route without session
    if (isProtectedPath && !session) {
      console.log('🚫 Middleware: Redirecting to login - no session for protected path')
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Redirect to dashboard if accessing auth pages with session
    if (isAuthPath && session) {
      console.log('✅ Middleware: Redirecting to dashboard - already authenticated')
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Redirect root to dashboard if authenticated, login if not
    if (request.nextUrl.pathname === '/') {
      if (session) {
        console.log('✅ Middleware: Redirecting root to dashboard - authenticated')
        return NextResponse.redirect(new URL('/dashboard', request.url))
      } else {
        console.log('🚫 Middleware: Redirecting root to login - not authenticated')
        return NextResponse.redirect(new URL('/login', request.url))
      }
    }

    console.log('✅ Middleware: Allowing request to continue')
    return response

  } catch (error) {
    console.error('❌ Middleware: Unexpected error:', error)
    // On error, allow the request to continue but redirect to login for protected routes
    const protectedPaths = ['/dashboard', '/teams', '/players', '/sanctions']
    const isProtectedPath = protectedPaths.some(path => 
      request.nextUrl.pathname.startsWith(path)
    )
    
    if (isProtectedPath) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

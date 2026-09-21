import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Aşağıdakiler hariç tüm rotaları eşleştir:
     * - _next/static (static dosyalar)
     * - _next/image (image optimization dosyaları)
     * - favicon.ico (favicon dosyası)
     * - public klasörü içindeki dosyalar
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { attachContentProtection } from '../lib/contentProtection'

/**
 * Site-wide content deterrents (CIO Today–style), with softer rules on auth/forms
 * and lab routes. Forms still allow paste via editable-target exceptions.
 */
export default function ContentProtection() {
  const { pathname } = useLocation()
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    // Motion lab / design experiments stay unrestricted for developers.
    if (pathname.startsWith('/lab/')) return

    const isReader = pathname.startsWith('/read/')
    const detach = attachContentProtection({
      blockSave: isReader || pathname.startsWith('/magazines'),
      onBlocked: () => {
        setToast('Content protection is enabled on THE GLOBAL ICON.')
      },
    })
    return detach
  }, [pathname])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(t)
  }, [toast])

  if (!toast) return null
  return (
    <div className="tgi-protect-toast" role="status" aria-live="polite">
      {toast}
    </div>
  )
}

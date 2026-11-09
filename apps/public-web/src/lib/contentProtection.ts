/**
 * Client-side content deterrents modeled on common magazine/WP “disable copy”
 * protections (e.g. theciotoday.com): context menu, copy/cut/paste, drag, and
 * common view-source / DevTools shortcuts.
 *
 * Honest limits: OS screenshots, browser extensions, and DevTools cannot be
 * fully blocked from the web. Real theft prevention still relies on auth,
 * private PDF streaming, HTTPS, and RBAC on the API.
 */

const FORM_FIELDS = 'INPUT,TEXTAREA,SELECT,[contenteditable="true"]'

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest(FORM_FIELDS))
}

export type ContentProtectionOptions = {
  /** When false, skip Ctrl/Cmd+S blocking (useful if download is allowed). */
  blockSave?: boolean
  /** Optional toast / UI hook. */
  onBlocked?: (reason: string) => void
}

export function attachContentProtection(options: ContentProtectionOptions = {}): () => void {
  const { blockSave = true, onBlocked } = options
  const notify = (reason: string) => onBlocked?.(reason)

  const onContextMenu = (e: MouseEvent) => {
    if (isEditableTarget(e.target)) return
    e.preventDefault()
    notify('right_click')
  }

  const onDragStart = (e: DragEvent) => {
    if (isEditableTarget(e.target)) return
    e.preventDefault()
    notify('drag')
  }

  const onClipboard = (e: Event) => {
    if (isEditableTarget(e.target)) return
    e.preventDefault()
    notify('clipboard')
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (isEditableTarget(e.target)) return
    const key = e.key?.toLowerCase?.() ?? ''
    const code = e.code

    // F12
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault()
      notify('devtools')
      return
    }

    // Ctrl/Cmd + Shift + I / J / C / K (inspect / console)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c', 'k'].includes(key)) {
      e.preventDefault()
      notify('devtools')
      return
    }

    // Ctrl/Cmd + U (view source)
    if ((e.ctrlKey || e.metaKey) && key === 'u') {
      e.preventDefault()
      notify('view_source')
      return
    }

    // Ctrl/Cmd + S (save page) — especially sensitive for PDF reader
    if (blockSave && (e.ctrlKey || e.metaKey) && key === 's') {
      e.preventDefault()
      notify('save')
      return
    }

    // Ctrl/Cmd + P (print)
    if ((e.ctrlKey || e.metaKey) && key === 'p') {
      e.preventDefault()
      notify('print')
      return
    }

    // Ctrl/Cmd + C / X / A on non-editable (A can still select page chrome; soften for a)
    if ((e.ctrlKey || e.metaKey) && ['c', 'x'].includes(key)) {
      e.preventDefault()
      notify('clipboard')
      return
    }

    // PrintScreen cannot be cancelled reliably; best-effort
    if (code === 'PrintScreen') {
      notify('screenshot')
    }
  }

  document.addEventListener('contextmenu', onContextMenu, true)
  document.addEventListener('dragstart', onDragStart, true)
  document.addEventListener('drop', onDragStart, true)
  document.addEventListener('copy', onClipboard, true)
  document.addEventListener('cut', onClipboard, true)
  document.addEventListener('paste', onClipboard, true)
  document.addEventListener('keydown', onKeyDown, true)

  document.documentElement.classList.add('tgi-content-protected')

  return () => {
    document.removeEventListener('contextmenu', onContextMenu, true)
    document.removeEventListener('dragstart', onDragStart, true)
    document.removeEventListener('drop', onDragStart, true)
    document.removeEventListener('copy', onClipboard, true)
    document.removeEventListener('cut', onClipboard, true)
    document.removeEventListener('paste', onClipboard, true)
    document.removeEventListener('keydown', onKeyDown, true)
    document.documentElement.classList.remove('tgi-content-protected')
  }
}

/**
 * One small place to show a Windows desktop notification. Clicking it brings
 * the shelf forward so the user can see the change.
 */
import { Notification } from 'electron'
import { getMainWindow, setVisible } from './window'
import { pushState } from './state'

export function showTrayNotification(title: string, body: string): void {
  try {
    if (!Notification.isSupported()) return
    const n = new Notification({ title, body, silent: false })
    n.on('click', () => {
      try {
        setVisible(true)
        const win = getMainWindow()
        if (win && !win.isDestroyed()) {
          win.show()
          win.focus()
        }
        pushState.togglePanel(true)
      } catch {
        /* ignore */
      }
    })
    n.show()
  } catch (err) {
    console.warn('[Notify] Could not show notification:', err)
  }
}

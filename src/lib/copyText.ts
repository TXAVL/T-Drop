/**
 * Copy text to the clipboard and report whether it really happened.
 *
 * T-Drop's shelf window is not focusable, so `navigator.clipboard.writeText`
 * is rejected there ("Document is not focused") while the UI used to show a
 * success toast anyway. The main process writes the clipboard instead
 * (`item:copy-text`), which also pauses the clipboard watcher so the copied
 * text does not come back as a new history card.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (window.edge?.copyText && (await window.edge.copyText(text))) return true
  } catch {
    /* fall through to the browser API */
  }
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** React entry — mounts <App/> and pulls in all stylesheet layers. */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'

// Stylesheet order matters: tokens first, then globals, then components.
import './styles/tokens.css'
import './styles/global.css'
import './styles/panel.css'
import './styles/item.css'
import './styles/settings.css'
import './styles/emoji.css'

const container = document.getElementById('root')
if (!container) throw new Error('#root element not found')

// Expose Device Pixel Ratio (DPR) to CSS for display-aware rendering.
// This allows effects like blur() to scale inversely with physical pixel density,
// saving massive amounts of GPU fill-rate on 4K/Hi-DPI displays.
const dpr = window.devicePixelRatio || 1
document.documentElement.style.setProperty('--dpr', dpr.toString())

const root = createRoot(container)

if (window.location.hash === '#onboarding' || window.location.hash === '#/onboarding' || window.location.hash.includes('onboarding')) {
  // The tutorial is only opened once. Keep its component (and its video UI)
  // out of the always-running panel renderer.
  void import('./Onboarding').then(async ({ Onboarding }) => {
    const { TxaTooltipProvider } = await import('./components/TxaTooltip')
    root.render(
      <StrictMode>
        <Onboarding />
        <TxaTooltipProvider />
      </StrictMode>
    )
  })
} else if (window.location.hash.includes('purchase') || window.location.hash.includes('renew')) {
  // Standalone checkout window: #purchase = buy a plan, #renew = extend the current key
  const mode = window.location.hash.includes('renew') ? 'renew' : 'buy'
  void import('./components/PurchaseModal').then(async ({ PurchaseWindowView }) => {
    const { TxaTooltipProvider } = await import('./components/TxaTooltip')
    root.render(
      <StrictMode>
        <PurchaseWindowView mode={mode} />
        <TxaTooltipProvider />
      </StrictMode>
    )
  })
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

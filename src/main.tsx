import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './app/App'
import { bootstrapCapacitor } from './infrastructure/capacitor'
import { ensureCryptoRandomUUID } from './shared/crypto-polyfill'
import './styles.css'

ensureCryptoRandomUUID()

const root = document.getElementById('root')
if (!root) throw new Error('Root element missing')

void bootstrapCapacitor().catch((error) => {
  console.error('[capacitor] bootstrap failed', error)
})

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

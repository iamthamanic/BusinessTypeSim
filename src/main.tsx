import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { bootstrapCapacitor } from './infrastructure/capacitor'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element missing')

void bootstrapCapacitor().catch((error) => {
  console.error('[capacitor] bootstrap failed', error)
})

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

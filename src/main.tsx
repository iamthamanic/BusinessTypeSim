import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './styles.css'

const root = document.querySelector('#root')
if (root instanceof HTMLElement) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './force-rebuild'

// Force rebuild marker v2.1.2
console.log('=== MAIN.TSX LOADED v2.1.2 ===')
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

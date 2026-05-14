import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Mapper from './Mapper.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

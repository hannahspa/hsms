import React from 'react'
import { createRoot } from 'react-dom/client'
import MyApp from './app'
import './css/app.css'

const root = createRoot(document.getElementById('app'))
root.render(<MyApp />)

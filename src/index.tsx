import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import { ChatApp } from './App'

// ! the only css imports in ts/x files
import './css/index.scss'
import 'reactflow/dist/style.css'

if (process.env.NODE_ENV === 'production') {
  console.log = () => {}
  console.error = () => {}
  console.debug = () => {}
}

/* -------------------------------------------------------------------------- */

// ! set up react router
const router = createBrowserRouter([
  {
    path: '/*',
    element: <ChatApp />,
  },
])

// ! render app
const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)

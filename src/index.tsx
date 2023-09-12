import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import { ChatApp } from './App'
import { Playground } from './Playground'
import { checkUserPermission, getPasswordNow } from './utils/timeBasedPassword'
import { debug } from './constants'

// ! the only css imports in ts/x files
import './css/index.scss'
import 'reactflow/dist/style.css'

if (process.env.NODE_ENV === 'production') {
  console.log = () => {}
  console.error = () => {}
  console.debug = () => {}
}

/* -------------------------------------------------------------------------- */

// ! get URL params
const urlParams = new URLSearchParams(window.location.search)
const pwd = urlParams.get('pwd')
const user = urlParams.get('user')

const userEnabled = user && checkUserPermission(user)
const accessEnabled = debug || pwd === getPasswordNow() || userEnabled

/* -------------------------------------------------------------------------- */

// ! set up react router
const router = createBrowserRouter([
  {
    path: '/*',
    element: accessEnabled ? <ChatApp /> : <></>,
  },
  {
    path: '/playground',
    element: accessEnabled ? <Playground /> : <></>,
  },
])

// ! render app
const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)

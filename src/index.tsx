import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import { ChatApp } from './App'
import { Playground } from './Playground'
import { getPasswordNow } from './utils/timeBasedPassword'
import { debug } from './constants'

// ! the only css imports in ts/x files
import './css/index.scss'
import 'reactflow/dist/style.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: <ChatApp />,
  },
  {
    path: '/playground',
    element: <Playground />,
  },
])

const root = ReactDOM.createRoot(document.getElementById('root')!)

// get URL params
const urlParams = new URLSearchParams(window.location.search)
const pwd = urlParams.get('pwd')

if (debug || pwd === getPasswordNow())
  if (process.env.REACT_APP_DEV_IDE === 'code')
    root.render(
      <React.StrictMode>
        <RouterProvider router={router} />
      </React.StrictMode>
    )
  // root.render(<ReactFlowComponent />)
  else if (process.env.REACT_APP_DEV_IDE === 'jet') {
    // ! only try to load react-buddy related components whn the dev ide is IntelliJ
    // import('./dev').then(m => {
    //   const ComponentPreviews = m.ComponentPreviews
    //   const useInitialHook = m.useInitial
    //   root.render(
    //     <React.StrictMode>
    //       <DevSupport
    //         ComponentPreviews={ComponentPreviews}
    //         useInitialHook={useInitialHook}
    //       >
    //         <ReactFlowComponent />
    //       </DevSupport>
    //     </React.StrictMode>
    //   )
    // })
  }

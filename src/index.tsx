import React from 'react'
import ReactDOM from 'react-dom/client'

import ReactFlowComponent from './ReactFlowComponent'

// ! the only css imports in ts/x files
import './css/index.scss'
import 'reactflow/dist/style.css'

const root = ReactDOM.createRoot(document.getElementById('root')!)

if (process.env.REACT_APP_DEV_IDE === 'code')
  root.render(
    <React.StrictMode>
      <ReactFlowComponent />
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

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();

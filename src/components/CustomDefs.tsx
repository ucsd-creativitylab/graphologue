import { EdgeMarker } from 'reactflow'
import { styles } from '../constants'

// TODO may need more kinds of identifications
export const getMarkerId = (color: string) => `c__${color}`

type CustomMarkerDefsProps = {
  markerOptions: EdgeMarker
}
export const CustomMarkerDefs = ({ markerOptions }: CustomMarkerDefsProps) => (
  <svg>
    <defs>
      <marker
        className={'react-flow__arrowhead'}
        id={getMarkerId(markerOptions.color || styles.edgeColorStrokeSelected)}
        markerWidth={markerOptions.width || styles.edgeMarkerSize}
        markerHeight={markerOptions.height || styles.edgeMarkerSize}
        viewBox="-10 -10 20 20"
        markerUnits="strokeWidth" // ?
        orient="auto"
        refX="0"
        refY="0"
      >
        <polyline
          stroke={markerOptions.color || styles.edgeColorStrokeDefault}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1"
          fill={markerOptions.color || styles.edgeColorStrokeDefault}
          points="-5,-4 0,0 -5,4 -5,-4"
        ></polyline>
      </marker>
    </defs>
  </svg>
)

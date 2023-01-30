import { MarkerType } from 'reactflow';

/* -------------------------------------------------------------------------- */

export interface EdgeData {
  id: string;
  source: string;
  target: string;
  animated: boolean;
  data: { label: string };
  type: 'custom';
  markerEndId: {
    type: MarkerType.ArrowClosed | MarkerType.Arrow;
  };
}

export interface NodeData {
  id: string;
  type: 'input' | 'output' | 'unspecified';
  data: { label: string };
  position: { x: number; y: number };
}

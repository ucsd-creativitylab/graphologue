import cytoscape, { LayoutOptions } from 'cytoscape'

export interface NodeForLayout {
  id: string
  width: number
  height: number
}

export type EdgeForLayout = [string, string]

export interface PositionedNode {
  id: string
  x: number
  y: number
}

export async function smartLayout(
  nodes: NodeForLayout[],
  edges: EdgeForLayout[]
): Promise<PositionedNode[]> {
  const cy = cytoscape({
    headless: true, // Enable headless mode, no rendering
    elements: [
      ...nodes.map(({ id, width, height }) => ({
        data: { id },
        css: {
          width: width,
          height: height,
        },
      })),
      ...edges.map(([source, target]) => ({
        data: { source, target },
      })),
    ],
    layout: {
      name: 'cose',
      nodeOverlap: 30,
      idealEdgeLength: 100,
    } as LayoutOptions,
  })

  // Run the layout algorithm
  const layout = cy.layout({
    name: 'cose',
  })
  layout.run()
  await layout.promiseOn('layoutstop')

  // Retrieve the positions of the nodes after running the layout
  const positionedNodes = cy.nodes().map((node: any) => {
    const position = node.position()
    return {
      id: node.id(),
      x: position.x,
      y: position.y,
    }
  })

  return positionedNodes
}

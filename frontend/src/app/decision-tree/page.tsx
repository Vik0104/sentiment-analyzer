"use client"

import {
  ReactFlow,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  type EdgeProps,
  getBezierPath,
  Handle,
  Position,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

interface TreeNodeData extends Record<string, unknown> {
  name: string
  value: string
  isNegative: boolean
}

function CustomNode({ data }: { data: TreeNodeData }) {
  const headerBg = data.isNegative ? "#ea4335" : "#34a853"

  return (
    <div
      className="flex flex-col"
      style={{ minWidth: 140, maxWidth: 180 }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-transparent !border-none !w-0 !h-0"
      />
      {/* Header with value - small colored bar */}
      <div
        style={{
          backgroundColor: headerBg,
          color: "white",
          fontSize: 12,
          fontWeight: 600,
          padding: "4px 12px",
          borderRadius: 4,
          textAlign: "center",
          marginBottom: 0,
          position: "relative",
          zIndex: 1,
        }}
      >
        {data.value}
      </div>
      {/* Body with label text - light blue card */}
      <div
        style={{
          backgroundColor: "#f0f9ff",
          border: "1px solid #7dd3fc",
          color: "#0369a1",
          fontSize: 11,
          padding: "14px 10px 12px 10px",
          borderRadius: 6,
          textAlign: "center",
          lineHeight: 1.5,
          whiteSpace: "pre-line",
          marginTop: -4,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        {data.name}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-transparent !border-none !w-0 !h-0"
      />
    </div>
  )
}

function DashedBezierEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.3,
  })

  return (
    <path
      id={id}
      d={edgePath}
      fill="none"
      stroke="#93c5fd"
      strokeWidth={2}
      strokeDasharray="6 6"
      strokeLinecap="round"
    />
  )
}

const nodeTypes = {
  customNode: CustomNode,
}

const edgeTypes = {
  dashed: DashedBezierEdge,
}

// Manually positioned nodes to match the image layout exactly
const initialNodes: Node<TreeNodeData>[] = [
  // Level 0 - Root
  {
    id: "root",
    type: "customNode",
    position: { x: 0, y: 340 },
    data: { name: "Poor Customer experience", value: "(-0.74)", isNegative: true },
  },
  // Level 1 - Main branches
  {
    id: "booking-experience",
    type: "customNode",
    position: { x: 250, y: 120 },
    data: { name: "Booking Experience", value: "-0.43", isNegative: true },
  },
  {
    id: "service-staff",
    type: "customNode",
    position: { x: 250, y: 340 },
    data: { name: "Service staff capability", value: "+0.30", isNegative: false },
  },
  {
    id: "pricing",
    type: "customNode",
    position: { x: 250, y: 540 },
    data: { name: "Pricing", value: "+0.22", isNegative: false },
  },
  // Level 2 - Booking Experience children
  {
    id: "ease-of-booking",
    type: "customNode",
    position: { x: 500, y: 40 },
    data: { name: "Ease of booking", value: "-0.28", isNegative: true },
  },
  {
    id: "poor-mobile-app",
    type: "customNode",
    position: { x: 500, y: 160 },
    data: { name: "Poor mobile app", value: "-0.52", isNegative: true },
  },
  // Level 2 - Service staff children
  {
    id: "attitude",
    type: "customNode",
    position: { x: 500, y: 280 },
    data: { name: "Attitude and style\nof response", value: "-0.27", isNegative: true },
  },
  {
    id: "communication",
    type: "customNode",
    position: { x: 500, y: 390 },
    data: { name: "Communication", value: "+0.29", isNegative: false },
  },
  {
    id: "responsiveness",
    type: "customNode",
    position: { x: 500, y: 490 },
    data: { name: "Responsiveness", value: "+0.67", isNegative: false },
  },
  // Level 2 - Pricing children
  {
    id: "discounts",
    type: "customNode",
    position: { x: 500, y: 590 },
    data: { name: "Discounts and Loyalty", value: "+0.30", isNegative: false },
  },
  {
    id: "value-for-money",
    type: "customNode",
    position: { x: 500, y: 700 },
    data: { name: "Value for money\nand affordability", value: "+0.27", isNegative: false },
  },
  // Level 3 - Poor mobile app children
  {
    id: "search-mobile",
    type: "customNode",
    position: { x: 750, y: 80 },
    data: { name: "Search on mobile is slow\nand cumbersome", value: "-0.52", isNegative: true },
  },
  {
    id: "photos-mobile",
    type: "customNode",
    position: { x: 750, y: 200 },
    data: { name: "Photos depicting the\nplace displayed in mobile", value: "-0.78", isNegative: true },
  },
]

const initialEdges: Edge[] = [
  // Root to Level 1
  { id: "e-root-booking", source: "root", target: "booking-experience", type: "dashed" },
  { id: "e-root-service", source: "root", target: "service-staff", type: "dashed" },
  { id: "e-root-pricing", source: "root", target: "pricing", type: "dashed" },
  // Booking Experience to children
  { id: "e-booking-ease", source: "booking-experience", target: "ease-of-booking", type: "dashed" },
  { id: "e-booking-mobile", source: "booking-experience", target: "poor-mobile-app", type: "dashed" },
  // Service staff to children
  { id: "e-service-attitude", source: "service-staff", target: "attitude", type: "dashed" },
  { id: "e-service-communication", source: "service-staff", target: "communication", type: "dashed" },
  { id: "e-service-responsiveness", source: "service-staff", target: "responsiveness", type: "dashed" },
  // Pricing to children
  { id: "e-pricing-discounts", source: "pricing", target: "discounts", type: "dashed" },
  { id: "e-pricing-value", source: "pricing", target: "value-for-money", type: "dashed" },
  // Poor mobile app to children
  { id: "e-mobile-search", source: "poor-mobile-app", target: "search-mobile", type: "dashed" },
  { id: "e-mobile-photos", source: "poor-mobile-app", target: "photos-mobile", type: "dashed" },
]

export default function ConsumerDecisionTree() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  return (
    <div className="w-full h-screen bg-white">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.3}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        <Controls />
        <Background color="#e5e7eb" gap={20} size={1} />
      </ReactFlow>
    </div>
  )
}

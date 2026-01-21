"use client"

import { useMemo, useState } from "react"
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
  MiniMap,
  Panel,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useAuth } from "@/lib/auth-context"
import { useDashboard, useAspects } from "@/lib/hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RefreshCw, TreeDeciduous, Info, TrendingUp, TrendingDown, Minus, ZoomIn, ZoomOut, Maximize2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface TreeNodeData extends Record<string, unknown> {
  name: string
  value: number
  isNegative: boolean
  mentions?: number
  type: "root" | "category" | "aspect" | "detail"
  priority?: string
}

function CustomNode({ data }: { data: TreeNodeData }) {
  const getHeaderBg = () => {
    if (data.value < -0.2) return "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)"
    if (data.value > 0.2) return "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)"
    return "linear-gradient(135deg, #ca8a04 0%, #eab308 100%)"
  }

  const getBodyBg = () => {
    if (data.type === "root") return "#1e293b"
    if (data.value < -0.2) return "#fef2f2"
    if (data.value > 0.2) return "#f0fdf4"
    return "#fefce8"
  }

  const getBorder = () => {
    if (data.type === "root") return "2px solid #334155"
    if (data.value < -0.2) return "1px solid #fecaca"
    if (data.value > 0.2) return "1px solid #bbf7d0"
    return "1px solid #fef08a"
  }

  const getTextColor = () => {
    if (data.type === "root") return "#f8fafc"
    if (data.value < -0.2) return "#991b1b"
    if (data.value > 0.2) return "#166534"
    return "#854d0e"
  }

  const getWidth = () => {
    if (data.type === "root") return 200
    if (data.type === "category") return 180
    return 160
  }

  const TrendIcon = data.value < -0.1 ? TrendingDown : data.value > 0.1 ? TrendingUp : Minus

  return (
    <div
      className="flex flex-col rounded-lg overflow-hidden shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02]"
      style={{ minWidth: getWidth(), maxWidth: getWidth() + 40 }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-slate-400 !border-2 !border-white !w-3 !h-3"
      />
      {/* Header with value */}
      <div
        style={{
          background: getHeaderBg(),
          color: "white",
          fontSize: data.type === "root" ? 14 : 12,
          fontWeight: 600,
          padding: data.type === "root" ? "10px 16px" : "6px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <TrendIcon size={14} />
        <span>{data.value >= 0 ? "+" : ""}{data.value.toFixed(2)}</span>
      </div>
      {/* Body with label */}
      <div
        style={{
          backgroundColor: getBodyBg(),
          border: getBorder(),
          color: getTextColor(),
          fontSize: data.type === "root" ? 13 : 11,
          padding: data.type === "root" ? "14px 12px" : "10px 8px",
          textAlign: "center",
          lineHeight: 1.4,
          whiteSpace: "pre-line",
        }}
      >
        <div className="font-semibold">{data.name}</div>
        {data.mentions && (
          <div className="text-[10px] opacity-70 mt-1">
            {data.mentions} mentions
          </div>
        )}
        {data.priority && (
          <Badge
            variant="outline"
            className="mt-1 text-[9px] px-1.5 py-0"
            style={{
              borderColor: data.priority === "fix_now" ? "#dc2626" :
                          data.priority === "maintain" ? "#16a34a" : "#ca8a04",
              color: data.priority === "fix_now" ? "#dc2626" :
                    data.priority === "maintain" ? "#16a34a" : "#ca8a04"
            }}
          >
            {data.priority.replace("_", " ")}
          </Badge>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-slate-400 !border-2 !border-white !w-3 !h-3"
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
  data,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.25,
  })

  const isNegative = data?.isNegative as boolean | undefined

  return (
    <path
      id={id}
      d={edgePath}
      fill="none"
      stroke={isNegative ? "#fca5a5" : "#86efac"}
      strokeWidth={2}
      strokeDasharray="6 4"
      strokeLinecap="round"
      className="transition-all duration-200"
    />
  )
}

const nodeTypes = {
  customNode: CustomNode,
}

const edgeTypes = {
  dashed: DashedBezierEdge,
}

export default function PerceptionTreePage() {
  const { user } = useAuth()
  const [industry, setIndustry] = useState<string>("general")
  const { data: dashboard, isLoading: dashboardLoading, refetch, isFetching } = useDashboard(industry)
  const { data: aspectsData, isLoading: aspectsLoading } = useAspects(industry)

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!dashboard || !aspectsData) {
      return { nodes: [], edges: [] }
    }

    const nodes: Node<TreeNodeData>[] = []
    const edges: Edge[] = []

    // Root node - Overall sentiment
    const overallSentiment = dashboard.overview.avg_sentiment
    nodes.push({
      id: "root",
      type: "customNode",
      position: { x: 0, y: 300 },
      data: {
        name: overallSentiment >= 0 ? "Positive Customer\nPerception" : "Areas for\nImprovement",
        value: overallSentiment,
        isNegative: overallSentiment < 0,
        type: "root",
      },
    })

    // Group aspects by sentiment
    const aspects = aspectsData.aspects || []
    const positiveAspects = aspects.filter(a => a.avg_sentiment > 0.1).sort((a, b) => b.avg_sentiment - a.avg_sentiment)
    const negativeAspects = aspects.filter(a => a.avg_sentiment < -0.1).sort((a, b) => a.avg_sentiment - b.avg_sentiment)
    const neutralAspects = aspects.filter(a => a.avg_sentiment >= -0.1 && a.avg_sentiment <= 0.1)

    // Key drivers from dashboard
    const keyDrivers = dashboard.key_drivers || []
    const painPoints = dashboard.pain_points || []

    // Create category nodes
    let yOffset = 50

    // Strengths category
    if (positiveAspects.length > 0) {
      const strengthsY = yOffset
      nodes.push({
        id: "strengths",
        type: "customNode",
        position: { x: 280, y: strengthsY },
        data: {
          name: "Strengths",
          value: positiveAspects.reduce((sum, a) => sum + a.avg_sentiment, 0) / positiveAspects.length,
          isNegative: false,
          type: "category",
          mentions: positiveAspects.reduce((sum, a) => sum + a.mentions, 0),
        },
      })
      edges.push({
        id: "e-root-strengths",
        source: "root",
        target: "strengths",
        type: "dashed",
        data: { isNegative: false },
      })

      // Add aspect nodes for strengths
      positiveAspects.slice(0, 4).forEach((aspect, index) => {
        const nodeId = `strength-${index}`
        const driver = keyDrivers.find(d => d.aspect === aspect.aspect)
        nodes.push({
          id: nodeId,
          type: "customNode",
          position: { x: 520, y: strengthsY - 60 + index * 80 },
          data: {
            name: aspect.aspect,
            value: aspect.avg_sentiment,
            isNegative: false,
            type: "aspect",
            mentions: aspect.mentions,
            priority: driver?.priority,
          },
        })
        edges.push({
          id: `e-strengths-${nodeId}`,
          source: "strengths",
          target: nodeId,
          type: "dashed",
          data: { isNegative: false },
        })
      })
      yOffset = strengthsY + Math.max(positiveAspects.slice(0, 4).length * 80, 200)
    }

    // Neutral category
    if (neutralAspects.length > 0) {
      const neutralY = yOffset + 50
      nodes.push({
        id: "neutral",
        type: "customNode",
        position: { x: 280, y: neutralY },
        data: {
          name: "Monitor",
          value: neutralAspects.reduce((sum, a) => sum + a.avg_sentiment, 0) / neutralAspects.length,
          isNegative: false,
          type: "category",
          mentions: neutralAspects.reduce((sum, a) => sum + a.mentions, 0),
        },
      })
      edges.push({
        id: "e-root-neutral",
        source: "root",
        target: "neutral",
        type: "dashed",
        data: { isNegative: false },
      })

      neutralAspects.slice(0, 3).forEach((aspect, index) => {
        const nodeId = `neutral-${index}`
        nodes.push({
          id: nodeId,
          type: "customNode",
          position: { x: 520, y: neutralY - 40 + index * 80 },
          data: {
            name: aspect.aspect,
            value: aspect.avg_sentiment,
            isNegative: false,
            type: "aspect",
            mentions: aspect.mentions,
          },
        })
        edges.push({
          id: `e-neutral-${nodeId}`,
          source: "neutral",
          target: nodeId,
          type: "dashed",
          data: { isNegative: false },
        })
      })
      yOffset = neutralY + Math.max(neutralAspects.slice(0, 3).length * 80, 150)
    }

    // Weaknesses category
    if (negativeAspects.length > 0) {
      const weaknessY = yOffset + 50
      nodes.push({
        id: "weaknesses",
        type: "customNode",
        position: { x: 280, y: weaknessY },
        data: {
          name: "Pain Points",
          value: negativeAspects.reduce((sum, a) => sum + a.avg_sentiment, 0) / negativeAspects.length,
          isNegative: true,
          type: "category",
          mentions: negativeAspects.reduce((sum, a) => sum + a.mentions, 0),
        },
      })
      edges.push({
        id: "e-root-weaknesses",
        source: "root",
        target: "weaknesses",
        type: "dashed",
        data: { isNegative: true },
      })

      negativeAspects.slice(0, 4).forEach((aspect, index) => {
        const nodeId = `weakness-${index}`
        const painPoint = painPoints.find(p => p.aspect === aspect.aspect)
        const driver = keyDrivers.find(d => d.aspect === aspect.aspect)
        nodes.push({
          id: nodeId,
          type: "customNode",
          position: { x: 520, y: weaknessY - 60 + index * 80 },
          data: {
            name: aspect.aspect,
            value: aspect.avg_sentiment,
            isNegative: true,
            type: "aspect",
            mentions: painPoint?.negative_mentions || aspect.mentions,
            priority: driver?.priority,
          },
        })
        edges.push({
          id: `e-weaknesses-${nodeId}`,
          source: "weaknesses",
          target: nodeId,
          type: "dashed",
          data: { isNegative: true },
        })

        // Add detail nodes for top pain points
        if (painPoint && painPoint.examples && index < 2) {
          painPoint.examples.slice(0, 2).forEach((example, exIndex) => {
            const detailId = `${nodeId}-detail-${exIndex}`
            nodes.push({
              id: detailId,
              type: "customNode",
              position: { x: 740, y: weaknessY - 60 + index * 80 + exIndex * 50 - 25 },
              data: {
                name: example.length > 40 ? example.substring(0, 40) + "..." : example,
                value: painPoint.avg_score,
                isNegative: true,
                type: "detail",
              },
            })
            edges.push({
              id: `e-${nodeId}-${detailId}`,
              source: nodeId,
              target: detailId,
              type: "dashed",
              data: { isNegative: true },
            })
          })
        }
      })
    }

    return { nodes, edges }
  }, [dashboard, aspectsData])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edgesState, , onEdgesChange] = useEdgesState(initialEdges)

  const isLoading = dashboardLoading || aspectsLoading

  if (isLoading) {
    return <PerceptionTreeSkeleton />
  }

  if (!dashboard || !aspectsData) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <TreeDeciduous className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Data Available</h2>
        <p className="text-muted-foreground max-w-md mb-4">
          We need review data to build your perception tree. Connect your Judge.me account to get started.
        </p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TreeDeciduous className="h-6 w-6 text-primary" />
            Customer Perception Tree
          </h1>
          <p className="text-muted-foreground">
            Visual breakdown of customer sentiment across product aspects
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="electronics">Electronics</SelectItem>
              <SelectItem value="fashion">Fashion</SelectItem>
              <SelectItem value="beauty">Beauty</SelectItem>
              <SelectItem value="home">Home & Garden</SelectItem>
            </SelectContent>
          </Select>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon">
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>The perception tree visualizes how customers feel about different aspects of your products. Green nodes indicate positive sentiment, red indicates areas needing improvement.</p>
            </TooltipContent>
          </Tooltip>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <span className="font-medium text-muted-foreground">Legend:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-r from-green-600 to-green-500" />
              <span>Positive ({">"}0.2)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-r from-yellow-600 to-yellow-500" />
              <span>Neutral (-0.2 to 0.2)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-r from-red-600 to-red-500" />
              <span>Negative ({"<"}-0.2)</span>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Badge variant="outline" className="text-xs border-red-500 text-red-500">fix now</Badge>
              <Badge variant="outline" className="text-xs border-green-500 text-green-500">maintain</Badge>
              <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-500">monitor</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tree Visualization */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Sentiment Hierarchy</CardTitle>
              <CardDescription>
                Based on {dashboard.review_count.toLocaleString()} reviews • Pan and zoom to explore
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Maximize2 className="h-4 w-4" />
              <span>Drag to pan • Scroll to zoom</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[600px] bg-slate-50">
            <ReactFlow
              nodes={initialNodes}
              edges={initialEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.3}
              maxZoom={1.5}
              defaultViewport={{ x: 50, y: 0, zoom: 0.85 }}
              nodesDraggable={true}
              nodesConnectable={false}
              elementsSelectable={true}
            >
              <Controls position="bottom-right" />
              <MiniMap
                nodeStrokeWidth={3}
                zoomable
                pannable
                className="!bg-white !border !rounded-lg !shadow-md"
              />
              <Background color="#cbd5e1" gap={20} size={1} />
              <Panel position="top-right" className="bg-white/90 backdrop-blur rounded-lg p-3 shadow-md border">
                <div className="text-sm space-y-1">
                  <div className="font-medium">Overall Score</div>
                  <div className={`text-2xl font-bold ${dashboard.overview.avg_sentiment >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {dashboard.overview.avg_sentiment >= 0 ? "+" : ""}{dashboard.overview.avg_sentiment.toFixed(2)}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {aspectsData.aspects?.length || 0} aspects analyzed
                  </div>
                </div>
              </Panel>
            </ReactFlow>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Top Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {aspectsData.aspects
                ?.filter(a => a.avg_sentiment > 0.1)
                .sort((a, b) => b.avg_sentiment - a.avg_sentiment)
                .slice(0, 3)
                .map((aspect, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{aspect.aspect}</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      +{aspect.avg_sentiment.toFixed(2)}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Minus className="h-4 w-4 text-yellow-500" />
              Monitor Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {aspectsData.aspects
                ?.filter(a => a.avg_sentiment >= -0.1 && a.avg_sentiment <= 0.1)
                .slice(0, 3)
                .map((aspect, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{aspect.aspect}</span>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                      {aspect.avg_sentiment >= 0 ? "+" : ""}{aspect.avg_sentiment.toFixed(2)}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {aspectsData.aspects
                ?.filter(a => a.avg_sentiment < -0.1)
                .sort((a, b) => a.avg_sentiment - b.avg_sentiment)
                .slice(0, 3)
                .map((aspect, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{aspect.aspect}</span>
                    <Badge variant="secondary" className="bg-red-100 text-red-700">
                      {aspect.avg_sentiment.toFixed(2)}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function PerceptionTreeSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-[600px] w-full rounded-lg" />
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    </div>
  )
}

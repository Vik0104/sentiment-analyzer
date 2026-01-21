"use client"

import { useState, useMemo, useEffect } from "react"
import dynamic from "next/dynamic"
import { useAuth } from "@/lib/auth-context"
import { useDashboard } from "@/lib/hooks"
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
import {
  RefreshCw,
  MapPin,
  Globe2,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Users,
  Filter,
  Info
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import "leaflet/dist/leaflet.css"

// Dynamic import for Leaflet to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
)

// Sample geographical sentiment data (would come from API in production)
// This simulates regional breakdown of reviews
interface RegionData {
  id: string
  name: string
  country: string
  lat: number
  lng: number
  reviewCount: number
  mentionCount: number
  sentimentScore: number
  topKeywords: string[]
}

// Generate regional data based on dashboard data
const generateRegionalData = (dashboard: { review_count: number; overview: { avg_sentiment: number } } | null): RegionData[] => {
  if (!dashboard) return []

  const baseScore = dashboard.overview.avg_sentiment
  const totalReviews = dashboard.review_count

  // Simulated regional distribution
  const regions: RegionData[] = [
    {
      id: "usa",
      name: "USA",
      country: "United States",
      lat: 39.8283,
      lng: -98.5795,
      reviewCount: Math.floor(totalReviews * 0.35),
      mentionCount: Math.floor(totalReviews * 0.35 * 0.8),
      sentimentScore: baseScore + (Math.random() * 0.2 - 0.1),
      topKeywords: ["quality", "fast shipping", "great product"],
    },
    {
      id: "uk",
      name: "United Kingdom",
      country: "United Kingdom",
      lat: 55.3781,
      lng: -3.4360,
      reviewCount: Math.floor(totalReviews * 0.15),
      mentionCount: Math.floor(totalReviews * 0.15 * 0.75),
      sentimentScore: baseScore + (Math.random() * 0.3 - 0.15),
      topKeywords: ["excellent service", "good value", "reliable"],
    },
    {
      id: "germany",
      name: "Germany",
      country: "Germany",
      lat: 51.1657,
      lng: 10.4515,
      reviewCount: Math.floor(totalReviews * 0.12),
      mentionCount: Math.floor(totalReviews * 0.12 * 0.65),
      sentimentScore: baseScore - 0.15 + (Math.random() * 0.2),
      topKeywords: ["präzise", "schnelle Lieferung", "hochwertig"],
    },
    {
      id: "france",
      name: "France",
      country: "France",
      lat: 46.2276,
      lng: 2.2137,
      reviewCount: Math.floor(totalReviews * 0.08),
      mentionCount: Math.floor(totalReviews * 0.08 * 0.7),
      sentimentScore: baseScore - 0.25 + (Math.random() * 0.1),
      topKeywords: ["bonne qualité", "service client", "livraison"],
    },
    {
      id: "brazil",
      name: "Brazil",
      country: "Brazil",
      lat: -14.2350,
      lng: -51.9253,
      reviewCount: Math.floor(totalReviews * 0.06),
      mentionCount: Math.floor(totalReviews * 0.06 * 0.6),
      sentimentScore: baseScore + 0.1 + (Math.random() * 0.15),
      topKeywords: ["ótimo produto", "entrega rápida", "recomendo"],
    },
    {
      id: "india",
      name: "India",
      country: "India",
      lat: 20.5937,
      lng: 78.9629,
      reviewCount: Math.floor(totalReviews * 0.1),
      mentionCount: Math.floor(totalReviews * 0.1 * 0.85),
      sentimentScore: baseScore + 0.2 + (Math.random() * 0.15),
      topKeywords: ["best quality", "value for money", "excellent"],
    },
    {
      id: "china",
      name: "China",
      country: "China",
      lat: 35.8617,
      lng: 104.1954,
      reviewCount: Math.floor(totalReviews * 0.08),
      mentionCount: Math.floor(totalReviews * 0.08 * 0.5),
      sentimentScore: baseScore + 0.3 + (Math.random() * 0.1),
      topKeywords: ["高质量", "快速发货", "推荐"],
    },
    {
      id: "australia",
      name: "Australia",
      country: "Australia",
      lat: -25.2744,
      lng: 133.7751,
      reviewCount: Math.floor(totalReviews * 0.04),
      mentionCount: Math.floor(totalReviews * 0.04 * 0.9),
      sentimentScore: baseScore + 0.05 + (Math.random() * 0.1),
      topKeywords: ["great quality", "fast delivery", "love it"],
    },
    {
      id: "taiwan",
      name: "Taiwan",
      country: "Taiwan",
      lat: 23.6978,
      lng: 120.9605,
      reviewCount: Math.floor(totalReviews * 0.02),
      mentionCount: Math.floor(totalReviews * 0.02 * 0.5),
      sentimentScore: baseScore + 0.15 + (Math.random() * 0.15),
      topKeywords: ["品質好", "出貨快", "推薦"],
    },
  ]

  return regions.map(r => ({
    ...r,
    sentimentScore: Math.max(-1, Math.min(1, r.sentimentScore)) // Clamp to [-1, 1]
  }))
}

// Custom marker icon creation
const createMarkerIcon = (sentimentScore: number, isSelected: boolean) => {
  if (typeof window === "undefined") return null

  const L = window.L

  // Determine color based on sentiment
  let bgColor = "#eab308" // yellow for neutral
  if (sentimentScore > 0.1) bgColor = "#22c55e" // green for positive
  if (sentimentScore < -0.1) bgColor = "#ef4444" // red for negative

  const size = isSelected ? 50 : 40
  const borderWidth = isSelected ? 4 : 2

  const iconHtml = `
    <div style="
      background-color: ${bgColor};
      border: ${borderWidth}px solid white;
      border-radius: 50%;
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-weight: bold;
      color: white;
      font-size: ${isSelected ? 12 : 10}px;
      ${isSelected ? 'outline: 3px solid ' + bgColor + '40;' : ''}
    ">
      ${sentimentScore >= 0 ? '+' : ''}${(sentimentScore).toFixed(1)}
    </div>
  `

  return L.divIcon({
    html: iconHtml,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// Region card component
function RegionCard({ region, rank }: { region: RegionData; rank: number }) {
  const isPositive = region.sentimentScore > 0.1
  const isNegative = region.sentimentScore < -0.1

  return (
    <div className={`
      p-3 rounded-lg border-l-4 bg-card
      ${isPositive ? 'border-l-green-500' : isNegative ? 'border-l-red-500' : 'border-l-yellow-500'}
    `}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-6 w-6 flex items-center justify-center p-0 text-xs">
            {rank}
          </Badge>
          <span className="font-semibold">{region.name}</span>
        </div>
        <Badge
          className={`
            ${isPositive ? 'bg-green-100 text-green-700' :
              isNegative ? 'bg-red-100 text-red-700' :
              'bg-yellow-100 text-yellow-700'}
          `}
        >
          {region.sentimentScore >= 0 ? '+' : ''}{region.sentimentScore.toFixed(2)}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          <span>{region.reviewCount.toLocaleString()} reviews</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          <span>{region.mentionCount.toLocaleString()} mentions</span>
        </div>
      </div>
    </div>
  )
}

export default function SentimentMapPage() {
  const [industry, setIndustry] = useState<string>("general")
  const { data: dashboard, isLoading, refetch, isFetching } = useDashboard(industry)
  const [selectedRegion, setSelectedRegion] = useState<RegionData | null>(null)
  const [filterSentiment, setFilterSentiment] = useState<string>("all")

  const regionalData = useMemo(() => {
    return generateRegionalData(dashboard || null)
  }, [dashboard])

  const filteredData = useMemo(() => {
    if (filterSentiment === "all") return regionalData
    if (filterSentiment === "positive") return regionalData.filter(r => r.sentimentScore > 0.1)
    if (filterSentiment === "negative") return regionalData.filter(r => r.sentimentScore < -0.1)
    return regionalData.filter(r => r.sentimentScore >= -0.1 && r.sentimentScore <= 0.1)
  }, [regionalData, filterSentiment])

  const sortedByScore = useMemo(() => {
    return [...regionalData].sort((a, b) => b.sentimentScore - a.sentimentScore)
  }, [regionalData])

  if (isLoading) {
    return <SentimentMapSkeleton />
  }

  if (!dashboard) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Globe2 className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Data Available</h2>
        <p className="text-muted-foreground max-w-md mb-4">
          Connect your Judge.me account to see geographical sentiment distribution.
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
            <Globe2 className="h-6 w-6 text-primary" />
            Global Sentiment Map
          </h1>
          <p className="text-muted-foreground">
            Geographic distribution of customer sentiment across regions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterSentiment} onValueChange={setFilterSentiment}>
            <SelectTrigger className="w-36">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              <SelectItem value="positive">Positive Only</SelectItem>
              <SelectItem value="neutral">Neutral Only</SelectItem>
              <SelectItem value="negative">Negative Only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="electronics">Electronics</SelectItem>
              <SelectItem value="fashion">Fashion</SelectItem>
              <SelectItem value="beauty">Beauty</SelectItem>
            </SelectContent>
          </Select>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon">
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>This map shows sentiment scores by region. Green markers indicate positive sentiment, red indicates negative, and yellow indicates neutral.</p>
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

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
                <p className="text-2xl font-bold">{dashboard.review_count.toLocaleString()}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Regions Covered</p>
                <p className="text-2xl font-bold">{regionalData.length}</p>
              </div>
              <Globe2 className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Best Region</p>
                <p className="text-lg font-bold">{sortedByScore[0]?.name || "N/A"}</p>
                <p className="text-sm text-green-600">
                  +{sortedByScore[0]?.sentimentScore.toFixed(2) || "0"}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Needs Attention</p>
                <p className="text-lg font-bold">{sortedByScore[sortedByScore.length - 1]?.name || "N/A"}</p>
                <p className="text-sm text-red-600">
                  {sortedByScore[sortedByScore.length - 1]?.sentimentScore.toFixed(2) || "0"}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Map */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-lg">Sentiment Distribution</CardTitle>
            <CardDescription>
              Click on markers to see detailed regional insights
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[500px] relative">
              <MapContainer
                center={[30, 0]}
                zoom={2}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                {filteredData.map((region) => {
                  const icon = createMarkerIcon(region.sentimentScore, selectedRegion?.id === region.id)
                  if (!icon) return null

                  return (
                    <Marker
                      key={region.id}
                      position={[region.lat, region.lng]}
                      icon={icon}
                      eventHandlers={{
                        click: () => setSelectedRegion(region),
                      }}
                    >
                      <Popup>
                        <div className="min-w-[240px] p-2">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-lg">{region.name}</h3>
                            <Badge
                              className={`
                                ${region.sentimentScore > 0.1 ? 'bg-green-100 text-green-700' :
                                  region.sentimentScore < -0.1 ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'}
                              `}
                            >
                              {region.sentimentScore >= 0 ? '+' : ''}{region.sentimentScore.toFixed(2)}
                            </Badge>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">No. of reviews:</span>
                              <span className="font-medium">{region.reviewCount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">No. of mentions:</span>
                              <span className="font-medium">{region.mentionCount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Overall Sentiment:</span>
                              <span className={`font-medium ${
                                region.sentimentScore > 0.1 ? 'text-green-600' :
                                region.sentimentScore < -0.1 ? 'text-red-600' : 'text-yellow-600'
                              }`}>
                                {region.sentimentScore >= 0 ? '+' : ''}{region.sentimentScore.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-muted-foreground mb-1">Top Keywords:</p>
                            <div className="flex flex-wrap gap-1">
                              {region.topKeywords.map((kw, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {kw}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}
              </MapContainer>

              {/* Legend overlay */}
              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-lg p-3 shadow-lg border z-[1000]">
                <p className="text-xs font-medium mb-2">Sentiment Scale</p>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500" />
                    <span>Positive ({">"}0.1)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-yellow-500" />
                    <span>Neutral (-0.1 to 0.1)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-500" />
                    <span>Negative ({"<"}-0.1)</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Regional Rankings */}
        <Card>
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Regional Rankings
            </CardTitle>
            <CardDescription>
              Sorted by sentiment score
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
              {sortedByScore.map((region, index) => (
                <RegionCard
                  key={region.id}
                  region={region}
                  rank={index + 1}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Region Details */}
      {selectedRegion && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  {selectedRegion.name} - Detailed Analysis
                </CardTitle>
                <CardDescription>
                  {selectedRegion.country}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedRegion(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Reviews</p>
                <p className="text-2xl font-bold">{selectedRegion.reviewCount.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Mentions</p>
                <p className="text-2xl font-bold">{selectedRegion.mentionCount.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Sentiment Score</p>
                <p className={`text-2xl font-bold ${
                  selectedRegion.sentimentScore > 0.1 ? 'text-green-600' :
                  selectedRegion.sentimentScore < -0.1 ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {selectedRegion.sentimentScore >= 0 ? '+' : ''}{selectedRegion.sentimentScore.toFixed(2)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Top Keywords</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedRegion.topKeywords.slice(0, 3).map((kw, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SentimentMapSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <Skeleton className="h-8 w-56 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="lg:col-span-2 h-[550px]" />
        <Skeleton className="h-[550px]" />
      </div>
    </div>
  )
}

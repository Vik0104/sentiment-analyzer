"use client"

import { useState, useMemo } from "react"
import dynamic from "next/dynamic"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import {
  Factory,
  Users,
  Search,
  Filter,
  Plus,
  AlertTriangle,
  Building2,
  Truck,
  Package,
  User,
  MapPin,
  Phone,
  Mail,
  Globe,
  Calendar,
  Gauge,
  Network,
  Eye,
  EyeOff,
  Route,
  Ruler,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { NewCustomerSheet } from "./create-entity-modal"
import { useNewCustomer } from "@/features/customers/hooks/use-new-customer"
import { useCreateLocation } from "./use-create-location"
import { useGetCustomers } from "@/features/customers/api/use-get-customers"
import { useGetFacilities } from "@/features/facilities/api/use-get-facilities"
import { useGetSuppliers } from "@/features/suppliers/api/use-get-suppliers"
import { useGetLocations } from "@/features/locations/api/use-get-locations"
import type { MapEntity, EntityType, MapClickEvent, ConnectionLine } from "./map-entities"
import { getEntityRegion, REGION_COLORS } from "./map-entities"
import { toast } from "sonner"
import { createElement } from "react"
import { renderToString } from "react-dom/server"

// Dynamic import for react-leaflet components (client-side only)
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
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
)
const Tooltip = dynamic(
  () => import("react-leaflet").then((mod) => mod.Tooltip),
  { ssr: false }
)

// Fix Leaflet icon issues - only run on client
if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  })
}

// Connection colors and styles
const CONNECTION_STYLES = {
  supply: { color: "#22c55e", weight: 3, opacity: 0.7 },
  distribution: { color: "#3b82f6", weight: 3, opacity: 0.7 },
  customer: { color: "#f59e0b", weight: 2, opacity: 0.6 },
}

// Function to calculate distance between two points (Haversine formula)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLng = (lng2 - lng1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Function to estimate delivery time based on distance
const estimateDeliveryTime = (distance: number): string => {
  if (distance < 100) return "Same day"
  if (distance < 500) return "1-2 days"
  if (distance < 1000) return "2-3 days"
  if (distance < 2000) return "3-5 days"
  if (distance < 5000) return "5-7 days"
  return "7-14 days"
}

// Enhanced ConnectionLine interface
interface EnhancedConnectionLine extends ConnectionLine {
  distance: number
  deliveryTime: string
  region: string
  connectionId: string
}

// Function to get React icon component based on entity type
const getEntityIconComponent = (entityType: EntityType) => {
  switch (entityType) {
    case "customer":
      return User
    case "distribution":
      return Package
    case "factory":
      return Factory
    case "supplier":
      return Truck
    default:
      return Building2
  }
}

// Create custom icons for different entity types
const createCustomIcon = (entity: MapEntity, isSelected = false) => {
  if (typeof window === "undefined") return null

  let iconColor = ""
  switch (entity.type) {
    case "customer":
      iconColor = "#3b82f6" // blue-500
      break
    case "distribution":
      iconColor = "#ec4899" // pink-500
      break
    case "factory":
      iconColor = "#f59e42" // orange-400
      break
    case "supplier":
      iconColor = "#22c55e" // green-500
      break
  }

  const size = isSelected ? 40 : 32
  const highlightColor = isSelected ? "#fbbf24" : iconColor
  const borderWidth = isSelected ? 4 : 2
  const outlineStyle = isSelected ? "2px dotted #fbbf24" : "none"

  const IconComponent = getEntityIconComponent(entity.type)
  const iconContent = renderToString(
    createElement(IconComponent, {
      size: isSelected ? 20 : 16,
      color: "white",
      strokeWidth: 2,
    }),
  )

  const iconHtml = `
    <div style="background-color: ${highlightColor}; border: ${borderWidth}px solid white; border-radius: 50%; outline: ${outlineStyle}; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
      ${iconContent}
    </div>
  `

  return L.divIcon({
    html: iconHtml,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// Connection Line Popup Component
const ConnectionPopup = ({ connection }: { connection: EnhancedConnectionLine }) => {
  return (
    <div className="w-72 p-0">
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Route className="h-4 w-4" />
            Supply Chain Connection
          </CardTitle>
          <Badge variant="outline" className="w-fit" style={{ borderColor: connection.color, color: connection.color }}>
            {connection.region} Region
          </Badge>
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                <div className="w-0.5 h-6 bg-gray-300"></div>
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <div className="font-medium text-sm text-gray-900">{connection.from.name}</div>
                  <div className="text-xs text-gray-600">
                    {connection.from.city}, {connection.from.country}
                  </div>
                  <Badge variant="secondary" className="text-xs mt-1">
                    Distribution Center
                  </Badge>
                </div>
                <div>
                  <div className="font-medium text-sm text-gray-900">{connection.to.name}</div>
                  <div className="text-xs text-gray-600">
                    {connection.to.city}, {connection.to.country}
                  </div>
                  <Badge variant="secondary" className="text-xs mt-1">
                    Customer
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <Ruler className="h-3 w-3 text-gray-500" />
                <span className="font-medium">Distance</span>
              </div>
              <div className="text-lg font-semibold text-gray-900">{connection.distance.toFixed(0)} km</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-3 w-3 text-gray-500" />
                <span className="font-medium">Delivery Time</span>
              </div>
              <div className="text-lg font-semibold text-gray-900">{connection.deliveryTime}</div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Connection Type:</span>
              <Badge variant="outline" className="text-xs">
                Regional Distribution
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Route Status:</span>
              <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                Active
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Enhanced Popup Content Component
const PopupContent = ({ entity }: { entity: MapEntity }) => {
  const getEntityTypeColor = (type: EntityType) => {
    switch (type) {
      case "customer":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "distribution":
        return "bg-pink-100 text-pink-800 border-pink-200"
      case "factory":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "supplier":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getEntityIcon = (type: EntityType) => {
    switch (type) {
      case "customer":
        return <User className="h-4 w-4" />
      case "distribution":
        return <Package className="h-4 w-4" />
      case "factory":
        return <Factory className="h-4 w-4" />
      case "supplier":
        return <Truck className="h-4 w-4" />
      default:
        return <Building2 className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="w-80 p-0">
      <Card className={`border-0 shadow-none ${getEntityTypeColor(entity.type).split(" ")[0]}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${getEntityTypeColor(entity.type)}`}>{getEntityIcon(entity.type)}</div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">{entity.name}</CardTitle>
                <Badge variant="secondary" className={`mt-1 ${getEntityTypeColor(entity.type)} text-xs font-medium`}>
                  {entity.type.charAt(0).toUpperCase() + entity.type.slice(1)}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-700">{entity.locationName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 ml-6">
              <span>
                {entity.city}, {entity.country}
              </span>
            </div>
            {entity.address && entity.address !== "Unknown" && (
              <div className="flex items-start gap-2 text-sm text-gray-600 ml-6">
                <span className="text-xs">{entity.address}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-700">Region: {getEntityRegion(entity)}</span>
              <div className="w-4 h-2 rounded" style={{ backgroundColor: REGION_COLORS[getEntityRegion(entity)] }} />
            </div>
          </div>

          <Separator />

          {entity.connectedTo && entity.connectedTo.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Network className="h-3 w-3" />
                Connections
              </h4>
              <div className="text-sm text-gray-600">Connected to {entity.connectedTo.length} entities</div>
            </div>
          )}

          {(entity.phone || entity.email || entity.website) && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Contact</h4>
                {entity.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-3 w-3" />
                    <span>{entity.phone}</span>
                  </div>
                )}
                {entity.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-3 w-3" />
                    <span>{entity.email}</span>
                  </div>
                )}
                {entity.website && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Globe className="h-3 w-3" />
                    <span className="text-blue-600 hover:underline cursor-pointer">{entity.website}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {(entity.type === "distribution" || entity.type === "factory") && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Facility Details</h4>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building2 className="h-3 w-3" />
                  <span>Type: {entity.facilityType || "Unknown"}</span>
                </div>
                {entity.capacity && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Gauge className="h-3 w-3" />
                    <span>
                      Capacity: {entity.capacity} {entity.capacityUnit || "units"}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Created: {entity.createdAt ? formatDate(entity.createdAt) : "Unknown"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs">
                  {entity.inclusionType || "Unknown"}
                </Badge>
              </div>
            </div>
            <div className="text-xs text-gray-400 font-mono">
              {entity.lat.toFixed(4)}, {entity.lng.toFixed(4)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Map click handler component - dynamically imported
const MapClickHandlerComponent = dynamic(
  () =>
    import("react-leaflet").then((mod) => {
      const { useMapEvents } = mod
      return function MapClickHandler({
        onMapClick,
        isAddingMode,
      }: {
        onMapClick: (e: MapClickEvent) => void
        isAddingMode: boolean
      }) {
        useMapEvents({
          click: (e: { latlng: { lat: number; lng: number } }) => {
            if (isAddingMode) {
              onMapClick({
                lat: e.latlng.lat,
                lng: e.latlng.lng,
              })
            }
          },
        })
        return null
      }
    }),
  { ssr: false }
)

interface InteractiveSupplyChainMapProps {
  onSelectEntity?: (entity: MapEntity) => void
  selectedEntityId?: number
}

export default function InteractiveSupplyChainMap({ onSelectEntity, selectedEntityId }: InteractiveSupplyChainMapProps) {
  const { data: customers = [], isLoading: customersLoading } = useGetCustomers()
  const { data: facilities = [], isLoading: facilitiesLoading } = useGetFacilities()
  const { data: suppliers = [], isLoading: suppliersLoading } = useGetSuppliers()
  const { data: locations = [], isLoading: locationsLoading } = useGetLocations()
  const { onOpen } = useNewCustomer()
  const createLocation = useCreateLocation()

  const [searchQuery, setSearchQuery] = useState("")
  const [isAddingMode, setIsAddingMode] = useState(false)
  const [isCreatingLocation, setIsCreatingLocation] = useState(false)
  const [showConnections, setShowConnections] = useState(true)
  const [activeFilters, setActiveFilters] = useState({
    types: {
      customer: true,
      distribution: true,
      factory: true,
      supplier: true,
    },
  })

  // Transform data into MapEntity format and generate connections
  const { mapEntities, connectionLines, locationsWithoutCoordinates } = useMemo(() => {
    if (!customers || !locations || !facilities || !suppliers)
      return { mapEntities: [], connectionLines: [], locationsWithoutCoordinates: [] }

    const locationMap = new Map(locations.map((loc: { id: number }) => [loc.id, loc]))
    const entitiesWithoutCoords: { name: string; type: string; location: string; reason: string }[] = []
    const validEntities: MapEntity[] = []

    // Helper function to process entities
    const processEntities = (items: { id: number; name: string; locationId: number; [key: string]: unknown }[], entityType: EntityType) => {
      items.forEach((item) => {
        const location = locationMap.get(item.locationId) as { id: number; name: string; latitude: number; longitude: number; country?: string; city?: string; address?: string; phone?: string; email?: string; website?: string } | undefined
        if (!location) return

        if (
          !location.latitude ||
          !location.longitude ||
          typeof location.latitude !== "number" ||
          typeof location.longitude !== "number" ||
          isNaN(location.latitude) ||
          isNaN(location.longitude)
        ) {
          entitiesWithoutCoords.push({
            name: item.name,
            type: entityType,
            location: location.name,
            reason: "Missing or invalid coordinates",
          })
          return
        }

        validEntities.push({
          id: item.id,
          name: item.name,
          type: entityType,
          locationId: item.locationId,
          inclusionType: (item.inclusionType as string) || "Include",
          additionalParams: (item.additionalParams as Record<string, unknown>) || {},
          icon: item.icon as string | undefined,
          createdAt: item.createdAt as string | undefined,
          updatedAt: item.updatedAt as string | undefined,
          locationName: location.name,
          lat: location.latitude,
          lng: location.longitude,
          country: location.country || "Unknown",
          city: location.city || "Unknown",
          address: location.address || "Unknown",
          phone: location.phone,
          email: location.email,
          website: location.website,
          facilityType: item.type as string | undefined,
          capacity: item.capacity as number | undefined,
          capacityUnit: item.capacityUnit as string | undefined,
          connectedTo: (item.connectedTo as number[]) || [],
          parentId: item.parentId as number | undefined,
        })
      })
    }

    // Process all entity types
    processEntities(customers as { id: number; name: string; locationId: number }[], "customer")

    // Process facilities - separate by type
    const facilitiesTyped = facilities as { id: number; name: string; locationId: number; type?: string }[]
    const distributionCenters = facilitiesTyped.filter(
      (facility) => facility.type === "DC" || facility.type === "Distribution" || facility.type === "Warehouse",
    )
    const factoriesFiltered = facilitiesTyped.filter(
      (facility) => facility.type === "Factory" || facility.type === "Plant" || facility.type === "Manufacturing",
    )

    processEntities(distributionCenters, "distribution")
    processEntities(factoriesFiltered, "factory")

    const remainingFacilities = facilitiesTyped.filter(
      (facility) => !distributionCenters.includes(facility) && !factoriesFiltered.includes(facility),
    )
    processEntities(remainingFacilities, "distribution")
    processEntities(suppliers as { id: number; name: string; locationId: number }[], "supplier")

    // Generate connection lines - ONLY Distribution Centers to Customers by Region
    const connections: EnhancedConnectionLine[] = []
    const entityMap = new Map(validEntities.map((entity) => [entity.id, entity]))

    const distributionEntities = validEntities.filter((e) => e.type === "distribution")
    const customerEntities = validEntities.filter((e) => e.type === "customer")

    // Group customers by region
    const customersByRegion = customerEntities.reduce(
      (acc, customer) => {
        const region = getEntityRegion(customer)
        if (!acc[region]) {
          acc[region] = []
        }
        acc[region].push(customer)
        return acc
      },
      {} as Record<string, MapEntity[]>,
    )

    // Group distribution centers by region
    const distributionByRegion = distributionEntities.reduce(
      (acc, dc) => {
        const region = getEntityRegion(dc)
        if (!acc[region]) {
          acc[region] = []
        }
        acc[region].push(dc)
        return acc
      },
      {} as Record<string, MapEntity[]>,
    )

    // Connect distribution centers to customers within the same region
    Object.keys(customersByRegion).forEach((region) => {
      const regionCustomers = customersByRegion[region]
      const regionDCs = distributionByRegion[region] || []

      if (regionDCs.length > 0) {
        regionDCs.forEach((dc) => {
          regionCustomers.forEach((customer) => {
            const distance = calculateDistance(dc.lat, dc.lng, customer.lat, customer.lng)
            const deliveryTime = estimateDeliveryTime(distance)

            connections.push({
              from: dc,
              to: customer,
              type: "customer",
              color: REGION_COLORS[region] || REGION_COLORS["Other"],
              weight: 3,
              distance,
              deliveryTime,
              region,
              connectionId: `${dc.id}-${customer.id}`,
            })
          })
        })
      } else {
        if (distributionEntities.length > 0) {
          const avgCustomerLat = regionCustomers.reduce((sum, c) => sum + c.lat, 0) / regionCustomers.length
          const avgCustomerLng = regionCustomers.reduce((sum, c) => sum + c.lng, 0) / regionCustomers.length

          const nearestDC = distributionEntities.reduce((nearest, dc) => {
            const dcDistance = calculateDistance(dc.lat, dc.lng, avgCustomerLat, avgCustomerLng)
            const nearestDistance = calculateDistance(nearest.lat, nearest.lng, avgCustomerLat, avgCustomerLng)
            return dcDistance < nearestDistance ? dc : nearest
          })

          regionCustomers.forEach((customer) => {
            const distance = calculateDistance(nearestDC.lat, nearestDC.lng, customer.lat, customer.lng)
            const deliveryTime = estimateDeliveryTime(distance)

            connections.push({
              from: nearestDC,
              to: customer,
              type: "customer",
              color: "#94a3b8",
              weight: 2,
              distance,
              deliveryTime,
              region: "Cross-Region",
              connectionId: `${nearestDC.id}-${customer.id}`,
            })
          })
        }
      }
    })

    // Add explicit connections from entity data
    validEntities.forEach((entity) => {
      if (entity.connectedTo && entity.connectedTo.length > 0) {
        entity.connectedTo.forEach((targetId) => {
          const targetEntity = entityMap.get(targetId)
          if (targetEntity) {
            const region = getEntityRegion(entity)
            const distance = calculateDistance(entity.lat, entity.lng, targetEntity.lat, targetEntity.lng)
            const deliveryTime = estimateDeliveryTime(distance)

            connections.push({
              from: entity,
              to: targetEntity,
              type: "supply",
              color: REGION_COLORS[region] || "#6b7280",
              weight: 2,
              distance,
              deliveryTime,
              region,
              connectionId: `${entity.id}-${targetEntity.id}`,
            })
          }
        })
      }
    })

    return {
      mapEntities: validEntities,
      connectionLines: connections,
      locationsWithoutCoordinates: entitiesWithoutCoords,
    }
  }, [customers, locations, facilities, suppliers])

  // Filter entities based on active filters and search query
  const filteredEntities = useMemo(() => {
    return mapEntities.filter((entity) => {
      const typeMatch = activeFilters.types[entity.type]
      const searchMatch =
        searchQuery === "" ||
        entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entity.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entity.city.toLowerCase().includes(searchQuery.toLowerCase())

      return typeMatch && searchMatch
    })
  }, [mapEntities, activeFilters, searchQuery])

  // Filter connection lines based on visible entities
  const filteredConnections = useMemo(() => {
    const visibleEntityIds = new Set(filteredEntities.map((e) => e.id))
    return connectionLines.filter(
      (connection) => visibleEntityIds.has(connection.from.id) && visibleEntityIds.has(connection.to.id),
    )
  }, [connectionLines, filteredEntities])

  // Calculate map center based on entities
  const mapCenter = useMemo((): [number, number] => {
    if (filteredEntities.length === 0) {
      return [40.7128, -74.006] // Default to NYC
    }

    const avgLat = filteredEntities.reduce((sum, entity) => sum + entity.lat, 0) / filteredEntities.length
    const avgLng = filteredEntities.reduce((sum, entity) => sum + entity.lng, 0) / filteredEntities.length

    return [avgLat, avgLng]
  }, [filteredEntities])

  const toggleFilter = (type: EntityType) => {
    setActiveFilters((prev) => ({
      ...prev,
      types: {
        ...prev.types,
        [type]: !prev.types[type],
      },
    }))
  }

  const getLocationName = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      )
      const data = await response.json()

      if (data && data.display_name) {
        const address = data.address || {}
        const city = address.city || address.town || address.village || address.county || "Unknown City"
        const country = address.country || "Unknown Country"
        return `${city}, ${country}`
      }
    } catch (error) {
      console.error("Reverse geocoding failed:", error)
    }

    return `Location ${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }

  const handleMapClick = async (clickEvent: MapClickEvent) => {
    if (isAddingMode && !isCreatingLocation) {
      setIsCreatingLocation(true)
      toast.loading("Creating location...")

      try {
        const locationName = await getLocationName(clickEvent.lat, clickEvent.lng)
        const parts = locationName.split(", ")
        const city = parts[0] || "Unknown City"
        const country = parts[parts.length - 1] || "Unknown Country"

        const locationData = {
          name: locationName,
          latitude: clickEvent.lat,
          longitude: clickEvent.lng,
          city: city,
          country: country,
          address: locationName,
        }

        const result = await createLocation.mutateAsync(locationData)

        toast.dismiss()
        toast.success(`Location "${locationName}" created successfully!`)

        if ("data" in result && result.data && "id" in result.data) {
          onOpen()
        } else {
          toast.error("Failed to retrieve new location ID.")
        }

        setIsAddingMode(false)
      } catch (error) {
        toast.dismiss()
        toast.error("Failed to create location. Please try again.")
        console.error("Failed to create location:", error)
      } finally {
        setIsCreatingLocation(false)
      }
    }
  }

  const handleAddEntity = () => {
    setIsAddingMode(true)
  }

  const getEntityTypeStats = () => {
    const stats = {
      customer: 0,
      distribution: 0,
      factory: 0,
      supplier: 0,
    }

    mapEntities.forEach((entity) => {
      stats[entity.type]++
    })

    return stats
  }

  const stats = getEntityTypeStats()

  if (customersLoading || locationsLoading || facilitiesLoading || suppliersLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p>Loading map data...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="w-full h-full flex flex-col">
        {locationsWithoutCoordinates.length > 0 && (
          <Alert className="mx-4 mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {locationsWithoutCoordinates.length} entities cannot be displayed on the map due to missing coordinates.
              Please update location data with valid latitude and longitude values.
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="bg-white shadow-sm flex justify-between items-center p-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="bg-blue-700 rounded-full p-1 mr-2">
              <Network className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-medium">Connected Supply Chain Map</h1>
            <div className="ml-4 flex items-center gap-4 text-sm text-gray-600">
              <Badge variant="secondary" className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {stats.customer} Customers
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {stats.distribution} Distribution Centers
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Factory className="h-3 w-3" />
                {stats.factory} Factories
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Truck className="h-3 w-3" />
                {stats.supplier} Suppliers
              </Badge>
              <Badge variant="outline">
                <MapPin className="h-3 w-3 mr-1" />
                {locations.length} Locations
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Network className="h-3 w-3" />
                {filteredConnections.length} Connections
              </Badge>
              {locationsWithoutCoordinates.length > 0 && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {locationsWithoutCoordinates.length} Missing Coords
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Search entities..."
                className="pl-10 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {/* Connection Toggle */}
            <div className="flex items-center space-x-2">
              <Switch id="show-connections" checked={showConnections} onCheckedChange={setShowConnections} />
              <Label htmlFor="show-connections" className="flex items-center gap-1 text-sm">
                {showConnections ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                Connections
              </Label>
            </div>
            {/* Add Entity Button */}
            <Button
              size="sm"
              variant={isAddingMode ? "default" : "outline"}
              onClick={handleAddEntity}
              className="flex items-center gap-1"
              disabled={isCreatingLocation}
            >
              <Users className="h-4 w-4" />
              {isCreatingLocation ? "Creating Location..." : "Add Customer"}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Show:</span>
            </div>
            <div className="flex gap-2">
              {Object.entries(activeFilters.types).map(([type, active]) => (
                <Button
                  key={type}
                  size="sm"
                  variant={active ? "default" : "outline"}
                  onClick={() => toggleFilter(type as EntityType)}
                  className="text-xs"
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}s ({stats[type as EntityType]})
                </Button>
              ))}
            </div>
            {/* Enhanced Regions Legend */}
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 font-medium">Regions:</span>
              <div className="flex items-center gap-6">
                {Object.entries(REGION_COLORS).map(([region, color]) => {
                  const regionConnections = filteredConnections.filter(
                    (conn) => getEntityRegion(conn.from) === region || getEntityRegion(conn.to) === region,
                  )

                  const regionEntities = filteredEntities.filter((entity) => getEntityRegion(entity) === region)
                  const totalCount = regionConnections.length

                  if (totalCount === 0 && regionEntities.length === 0 && region !== "Other") return null

                  return (
                    <div key={region} className="flex items-center gap-2">
                      <div className="w-4 h-1 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-sm text-gray-700">
                        {region} ({totalCount})
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
            {isAddingMode && (
              <div className="ml-auto flex items-center gap-2 text-sm text-blue-600">
                <Plus className="h-4 w-4" />
                {isCreatingLocation
                  ? "Creating location and opening customer form..."
                  : "Click on the map to create a location and add a customer"}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddingMode(false)}
                  disabled={isCreatingLocation}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 min-h-[500px] relative">
          {filteredEntities.length > 0 || locations.length > 0 ? (
            <MapContainer
              center={mapCenter}
              zoom={3}
              style={{ height: "100%", width: "100%", zIndex: 1 }}
              className={isAddingMode ? "cursor-crosshair" : ""}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              <MapClickHandlerComponent onMapClick={handleMapClick} isAddingMode={isAddingMode} />

              {/* Connection Lines with Popups */}
              {showConnections &&
                filteredConnections.map((connection, index) => (
                  <Polyline
                    key={`connection-${index}`}
                    positions={[
                      [connection.from.lat, connection.from.lng],
                      [connection.to.lat, connection.to.lng],
                    ]}
                    color={connection.color}
                    weight={connection.weight}
                    opacity={CONNECTION_STYLES[connection.type]?.opacity || 0.6}
                    dashArray={connection.type === "customer" ? "5, 10" : undefined}
                  >
                    <Popup maxWidth={300} className="connection-popup">
                      <ConnectionPopup connection={connection} />
                    </Popup>
                    <Tooltip direction="center" offset={[0, 0]} opacity={0.9} permanent={false}>
                      <div className="text-xs bg-white px-2 py-1 rounded shadow-lg border">
                        <div className="font-medium">
                          {connection.from.name} → {connection.to.name}
                        </div>
                        <div className="text-gray-600">
                          {connection.distance.toFixed(0)} km • {connection.deliveryTime}
                        </div>
                      </div>
                    </Tooltip>
                  </Polyline>
                ))}

              {/* Entity Markers */}
              {filteredEntities.map((entity) => {
                const icon = createCustomIcon(entity, selectedEntityId === entity.id)
                if (!icon) return null
                return (
                  <Marker
                    key={`${entity.type}-${entity.id}`}
                    position={[entity.lat, entity.lng]}
                    icon={icon}
                    eventHandlers={{
                      click: () => {
                        if (!isAddingMode && onSelectEntity) {
                          onSelectEntity(entity)
                        }
                      },
                    }}
                  >
                    <Popup maxWidth={320} className="custom-popup">
                      <PopupContent entity={entity} />
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50">
              <div className="text-center">
                <Network className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No supply chain data to display</h3>
                <p className="text-gray-600 mb-4">
                  Click &quot;Add Customer&quot; and then click anywhere on the map to create a location and add a customer.
                </p>
                <Button onClick={handleAddEntity} disabled={isCreatingLocation}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customer
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <NewCustomerSheet />
    </>
  )
}

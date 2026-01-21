// Entity type definitions for the interactive supply chain map

export type EntityType = "customer" | "distribution" | "factory" | "supplier"

export interface MapEntity {
  id: number
  name: string
  type: EntityType
  locationId: number
  inclusionType?: string
  additionalParams?: Record<string, unknown>
  icon?: string
  createdAt?: string
  updatedAt?: string
  // Location details
  locationName: string
  lat: number
  lng: number
  country: string
  city: string
  address?: string
  phone?: string
  email?: string
  website?: string
  // Facility-specific
  facilityType?: string
  capacity?: number
  capacityUnit?: string
  // Connections
  connectedTo?: number[]
  parentId?: number
}

export interface CreateEntityData {
  name: string
  type: EntityType
  locationId: number
  inclusionType?: string
  additionalParams?: Record<string, unknown>
  icon?: string
}

export interface MapClickEvent {
  lat: number
  lng: number
}

export interface ConnectionLine {
  from: MapEntity
  to: MapEntity
  type: "supply" | "distribution" | "customer"
  color: string
  weight: number
}

// Region mapping based on countries
export const COUNTRY_REGIONS: Record<string, string> = {
  // North America
  "United States": "North America",
  "USA": "North America",
  "Canada": "North America",
  "Mexico": "North America",

  // Europe
  "United Kingdom": "Europe",
  "UK": "Europe",
  "Germany": "Europe",
  "France": "Europe",
  "Italy": "Europe",
  "Spain": "Europe",
  "Netherlands": "Europe",
  "Belgium": "Europe",
  "Switzerland": "Europe",
  "Austria": "Europe",
  "Sweden": "Europe",
  "Norway": "Europe",
  "Denmark": "Europe",
  "Finland": "Europe",
  "Poland": "Europe",
  "Czech Republic": "Europe",
  "Portugal": "Europe",
  "Ireland": "Europe",
  "Greece": "Europe",
  "Hungary": "Europe",
  "Romania": "Europe",
  "Bulgaria": "Europe",
  "Croatia": "Europe",
  "Slovakia": "Europe",
  "Slovenia": "Europe",
  "Estonia": "Europe",
  "Latvia": "Europe",
  "Lithuania": "Europe",
  "Luxembourg": "Europe",

  // Asia Pacific
  "China": "Asia Pacific",
  "Japan": "Japan",
  "South Korea": "Asia Pacific",
  "Korea": "Asia Pacific",
  "India": "Asia Pacific",
  "Australia": "Asia Pacific",
  "New Zealand": "Asia Pacific",
  "Singapore": "Asia Pacific",
  "Malaysia": "Asia Pacific",
  "Thailand": "Asia Pacific",
  "Indonesia": "Asia Pacific",
  "Vietnam": "Asia Pacific",
  "Philippines": "Asia Pacific",
  "Taiwan": "Asia Pacific",
  "Hong Kong": "Asia Pacific",

  // Latin America
  "Brazil": "Latin America",
  "Argentina": "Latin America",
  "Chile": "Latin America",
  "Colombia": "Latin America",
  "Peru": "Latin America",
  "Venezuela": "Latin America",
  "Ecuador": "Latin America",
  "Bolivia": "Latin America",
  "Paraguay": "Latin America",
  "Uruguay": "Latin America",

  // Middle East & Africa
  "United Arab Emirates": "Middle East",
  "UAE": "Middle East",
  "Saudi Arabia": "Middle East",
  "Israel": "Middle East",
  "Turkey": "Middle East",
  "Egypt": "Middle East",
  "South Africa": "Africa",
  "Nigeria": "Africa",
  "Kenya": "Africa",
  "Morocco": "Africa",

  // Russia & CIS
  "Russia": "Russia & CIS",
  "Ukraine": "Russia & CIS",
  "Kazakhstan": "Russia & CIS",
  "Belarus": "Russia & CIS",
}

export const REGION_COLORS: Record<string, string> = {
  "North America": "#3b82f6",   // Blue
  "Europe": "#22c55e",          // Green
  "Asia Pacific": "#f59e0b",    // Orange
  "Japan": "#ef4444",           // Red
  "Latin America": "#8b5cf6",   // Purple
  "Middle East": "#ec4899",     // Pink
  "Africa": "#14b8a6",          // Teal
  "Russia & CIS": "#6366f1",    // Indigo
  "Other": "#6b7280",           // Gray
}

export function getEntityRegion(entity: MapEntity): string {
  const country = entity.country || "Unknown"
  return COUNTRY_REGIONS[country] || "Other"
}

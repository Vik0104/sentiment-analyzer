"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import type { MapEntity } from "@/components/intermap/map-entities"

// Dynamic import to avoid SSR issues with Leaflet
const InteractiveSupplyChainMap = dynamic(
  () => import("@/components/intermap/interactive-supply-chain-map"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p>Loading map...</p>
        </div>
      </div>
    )
  }
)

export default function MapPage() {
  const [selectedEntity, setSelectedEntity] = useState<MapEntity | null>(null)

  const handleSelectEntity = (entity: MapEntity) => {
    setSelectedEntity(entity)
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Map */}
      <div className="flex-1">
        <InteractiveSupplyChainMap
          onSelectEntity={handleSelectEntity}
          selectedEntityId={selectedEntity?.id}
        />
      </div>
    </div>
  )
}

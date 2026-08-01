/**
 * TripMap Component
 * Renders Sri Lanka map with route visualization using Google Maps
 * Design: Tropical Cartography - terracotta route lines, custom markers
 */

import { useEffect, useRef, useState } from "react";
import { MapView } from "@/components/Map";
import { MAP_MARKERS } from "@/lib/locations";

interface TripMapProps {
  routeLocations: string[]; // canonical location names
  warningMode?: boolean;    // B判定時：地図上に警告を表示
  compact?: boolean;        // 代替案カード内で小さく表示
}

export default function TripMap({ routeLocations, warningMode = false, compact = false }: TripMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const [mapReady, setMapReady] = useState(false);

  const handleMapReady = (map: google.maps.Map) => {
    mapRef.current = map;
    setMapReady(true);
  };

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    // Clear existing markers and polylines
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];

    if (routeLocations.length === 0) {
      // Show all major markers as subtle dots
      Object.entries(MAP_MARKERS).forEach(([, coords]) => {
        const marker = new google.maps.Marker({
          map,
          position: { lat: coords.lat, lng: coords.lng },
          title: coords.label,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: "#8B6B4A",
            fillOpacity: 0.7,
            strokeColor: "#ffffff",
            strokeWeight: 1.5,
          },
          label: {
            text: coords.label.slice(0, 3),
            color: "#3D2B1F",
            fontSize: "9px",
            fontWeight: "600",
          },
        });
        markersRef.current.push(marker);
      });
      return;
    }

    // Draw route
    const routeCoords: google.maps.LatLngLiteral[] = [];
    const visitedLocs = new Set<string>();

    for (let i = 0; i < routeLocations.length; i++) {
      const loc = routeLocations[i];
      const markerData = MAP_MARKERS[loc];
      if (!markerData) continue;

      if (!visitedLocs.has(loc)) {
        const isStart = i === 0;
        const isEnd = i === routeLocations.length - 1;
        const color = isStart ? "#2D5A27" : isEnd ? "#C4622D" : "#E8821A";
        const scale = (isStart || isEnd) ? 10 : 8;

        const marker = new google.maps.Marker({
          map,
          position: { lat: markerData.lat, lng: markerData.lng },
          title: markerData.label,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          label: {
            text: markerData.label.slice(0, 3),
            color: "#ffffff",
            fontSize: "9px",
            fontWeight: "700",
          },
          zIndex: isStart || isEnd ? 10 : 5,
        });
        markersRef.current.push(marker);
        visitedLocs.add(loc);
      }
      routeCoords.push({ lat: markerData.lat, lng: markerData.lng });
    }

    // Draw polyline connecting route
    if (routeCoords.length >= 2) {
      const polyline = new google.maps.Polyline({
        path: routeCoords,
        geodesic: true,
        strokeColor: "#C4622D",
        strokeOpacity: 0.85,
        strokeWeight: 3,
        map,
      });
      polylinesRef.current.push(polyline);
    }

    // Fit bounds
    if (routeCoords.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      routeCoords.forEach(c => bounds.extend(c));
      // ルート全体が余裕を持って収まるよう大きめのpaddingを設定
      map.fitBounds(bounds, { top: 80, right: 80, bottom: 80, left: 80 });
    }
  }, [routeLocations, mapReady]);

  const minH = compact ? "240px" : "400px";
  return (
    <div className="w-full relative" style={{ height: "100%", minHeight: minH }}>
      <MapView
        onMapReady={handleMapReady}
        initialCenter={{ lat: 7.8731, lng: 80.7718 }}
        initialZoom={7}
        className="w-full"
        style={{ height: "100%", minHeight: minH }}
      />
      {routeLocations.length === 0 && !warningMode && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium pointer-events-none whitespace-nowrap"
          style={{
            background: "rgba(250,247,240,0.92)",
            border: "1px solid #E8D5A3",
            color: "#8B6B4A",
            backdropFilter: "blur(8px)",
          }}
        >
          旅程を入力するとルートが表示されます
        </div>
      )}
      {warningMode && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ background: "rgba(255,255,255,0.55)" }}
        >
          <div
            className="px-5 py-3 rounded-xl text-center font-semibold text-sm leading-relaxed"
            style={{
              background: "rgba(255,255,255,0.95)",
              border: "2px solid #DC2626",
              color: "#DC2626",
              boxShadow: "0 4px 16px rgba(220,38,38,0.15)",
              maxWidth: "320px",
            }}
          >
            体力上・安全上運行が難しいです。<br />代替案をご確認ください。
          </div>
        </div>
      )}
    </div>
  );
}

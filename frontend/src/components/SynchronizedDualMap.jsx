import React, { useEffect, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polygon,
  Polyline,
  Tooltip,
  Popup,
  useMap,
  useMapEvents
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Maximize2, RotateCcw, MapPin, Eye, CheckCircle2, Layers } from 'lucide-react';

const CHICAGO_CENTER = [41.8781, -87.6298];
const DEFAULT_ZOOM = 11;

// Color helper for match classifications
export function getClassificationColor(classification) {
  switch (classification) {
    case 'SPATIALLY_MATCHED':
      return '#2EC4B6'; // Emerald / Mint
    case 'UNCERTAIN_MATCH':
      return '#E9B44C'; // Amber
    case 'NEWLY_OBSERVED':
      return '#35B8E8'; // Lake Blue
    case 'NO_LONGER_OBSERVED':
      return '#E76F74'; // Alert Red
    default:
      return '#7E92B0'; // Slate
  }
}

// Controller to sync map center and zoom without infinite feedback loops
function MapSyncController({ center, zoom, onMove, mapId, source }) {
  const map = useMap();

  useMapEvents({
    moveend: () => {
      if (onMove) {
        const c = map.getCenter();
        const z = map.getZoom();
        const dist = Math.abs(c.lat - center[0]) + Math.abs(c.lng - center[1]);
        if (dist > 0.0001 || z !== zoom) {
          onMove({
            center: [c.lat, c.lng],
            zoom: z,
            source: mapId
          });
        }
      }
    }
  });

  useEffect(() => {
    if (source && source !== mapId) {
      map.setView(center, zoom, { animate: false });
    }
  }, [center, zoom, source, mapId, map]);

  return null;
}

export default function SynchronizedDualMap({
  periodALabel,
  periodBLabel,
  clustersA = [],
  clustersB = [],
  spatialMatches = [],
  selectedMatch = null,
  onSelectMatch = () => {}
}) {
  const [mapState, setMapState] = useState({
    center: CHICAGO_CENTER,
    zoom: DEFAULT_ZOOM,
    source: null
  });

  const [tileError, setTileError] = useState(false);

  const handleMapMove = ({ center, zoom, source }) => {
    setMapState({ center, zoom, source });
  };

  const handleReset = () => {
    setMapState({
      center: CHICAGO_CENTER,
      zoom: DEFAULT_ZOOM,
      source: 'reset'
    });
  };

  // Find match classification for each cluster A
  const matchMapA = {};
  const matchMapB = {};
  spatialMatches.forEach((m) => {
    if (m.period_a_cluster_id !== null && m.period_a_cluster_id !== undefined) {
      matchMapA[m.period_a_cluster_id] = m;
    }
    if (m.period_b_cluster_id !== null && m.period_b_cluster_id !== undefined) {
      matchMapB[m.period_b_cluster_id] = m;
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Top Map Sync Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        background: 'rgba(23, 54, 93, 0.4)',
        padding: '8px 14px',
        borderRadius: '8px',
        border: '1px solid rgba(53, 184, 232, 0.25)',
        fontSize: '12px',
        color: '#EAF2FF'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={14} style={{ color: 'var(--lake-blue, #35B8E8)' }} />
          <span>Synchronized Spatial Comparison Viewport (Bipartite Pan/Zoom Lock)</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {selectedMatch && (
            <span style={{
              background: 'rgba(53, 184, 232, 0.15)',
              color: 'var(--lake-blue, #35B8E8)',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid rgba(53, 184, 232, 0.3)',
              fontFamily: 'monospace',
              fontSize: '11px'
            }}>
              Active Selection: {selectedMatch.period_a_label || 'None'} ➔ {selectedMatch.period_b_label || 'None'}
              {selectedMatch.centroid_distance_meters !== null && ` (${selectedMatch.centroid_distance_meters}m displacement)`}
            </span>
          )}

          <button
            type="button"
            onClick={handleReset}
            style={{
              background: 'transparent',
              color: 'var(--text-muted, #7E92B0)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <RotateCcw size={12} />
            <span>Reset View</span>
          </button>
        </div>
      </div>

      {/* Visual Classification Color Legend */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px',
        background: 'rgba(15, 23, 42, 0.65)',
        padding: '6px 14px',
        borderRadius: '6px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        fontSize: '11.5px'
      }}>
        <span style={{ color: 'var(--text-muted, #7E92B0)', fontWeight: 600 }}>Classification Legend:</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2EC4B6' }} />
          <span style={{ color: '#EAF2FF' }}>Spatially Matched (&le; 300m)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#E9B44C' }} />
          <span style={{ color: '#EAF2FF' }}>Uncertain Match (300m - 500m)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#35B8E8' }} />
          <span style={{ color: '#EAF2FF' }}>Newly Observed (Period B)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#E76F74' }} />
          <span style={{ color: '#EAF2FF' }}>No Longer Observed (Period A)</span>
        </div>
      </div>

      {/* Dual Maps Container */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
        gap: '16px'
      }}>
        {/* MAP A: BASELINE PERIOD */}
        <div style={{
          background: 'var(--bg-elevated, #101B2E)',
          borderRadius: '10px',
          border: '1px solid rgba(129, 140, 248, 0.35)',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#818cf8' }} />
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#EAF2FF' }}>
                Period A: {periodALabel} ({clustersA.length} Clusters)
              </h4>
            </div>
            <span style={{ fontSize: '11px', color: '#818cf8', fontFamily: 'monospace' }}>
              Baseline Clusters
            </span>
          </div>

          <div style={{ height: '420px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
            <MapContainer
              center={mapState.center}
              zoom={mapState.zoom}
              scrollWheelZoom={true}
              style={{ width: '100%', height: '100%', background: '#0B1423' }}
            >
              <MapSyncController
                center={mapState.center}
                zoom={mapState.zoom}
                onMove={handleMapMove}
                mapId="mapA"
                source={mapState.source}
              />
              {!tileError ? (
                <>
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                    attribution='&copy; <a href="https://www.esri.com/" target="_blank" rel="noreferrer">Esri</a>, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
                    maxNativeZoom={16}
                    maxZoom={18}
                    eventHandlers={{
                      tileerror: () => setTileError(true)
                    }}
                  />
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
                    attribution=""
                    maxNativeZoom={16}
                    maxZoom={18}
                    opacity={0.8}
                  />
                </>
              ) : (
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
                  className="nightfall-osm-tiles"
                  maxZoom={19}
                />
              )}

              {/* Cluster Extents (Convex Hulls) */}
              {clustersA.map((cl) => {
                const match = matchMapA[cl.cluster_id];
                const color = match ? getClassificationColor(match.match_classification) : '#818cf8';
                const isSelected = selectedMatch && selectedMatch.period_a_cluster_id === cl.cluster_id;

                if (!cl.convex_hull || cl.convex_hull.length < 3) return null;
                return (
                  <Polygon
                    key={`hull-a-${cl.cluster_id}`}
                    positions={cl.convex_hull}
                    pathOptions={{
                      color: isSelected ? '#FFFFFF' : color,
                      fillColor: color,
                      fillOpacity: isSelected ? 0.45 : 0.2,
                      weight: isSelected ? 3 : 1.5,
                      dashArray: isSelected ? '4,4' : undefined
                    }}
                    eventHandlers={{
                      click: () => match && onSelectMatch(match)
                    }}
                  />
                );
              })}

              {/* Cluster Centroids */}
              {clustersA.map((cl) => {
                const match = matchMapA[cl.cluster_id];
                const color = match ? getClassificationColor(match.match_classification) : '#818cf8';
                const isSelected = selectedMatch && selectedMatch.period_a_cluster_id === cl.cluster_id;
                const radius = Math.max(9, Math.min(26, Math.sqrt(cl.incident_count) * 0.8));

                return (
                  <CircleMarker
                    key={`cent-a-${cl.cluster_id}`}
                    center={[cl.centroid.lat, cl.centroid.lon]}
                    radius={isSelected ? radius + 4 : radius}
                    pathOptions={{
                      fillColor: color,
                      color: isSelected ? '#FFFFFF' : '#0B1423',
                      weight: isSelected ? 3 : 2,
                      fillOpacity: 0.9
                    }}
                    eventHandlers={{
                      click: () => match && onSelectMatch(match)
                    }}
                  >
                    <Tooltip direction="top" opacity={0.95}>
                      <div style={{ fontSize: '11px', color: '#0B1423', fontWeight: 600 }}>
                        <div style={{ fontWeight: 700, color: '#17365D' }}>{cl.cluster_label} (Period A)</div>
                        <div>Incidents: <strong>{cl.incident_count.toLocaleString()}</strong></div>
                        {match && (
                          <div style={{ marginTop: '2px', color: color, fontWeight: 700 }}>
                            {match.match_classification}
                            {match.centroid_distance_meters !== null && ` (${match.centroid_distance_meters}m)`}
                          </div>
                        )}
                      </div>
                    </Tooltip>
                    <Popup>
                      <div style={{ color: '#0B1423', padding: '4px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 700 }}>
                          {cl.cluster_label} (Period A)
                        </h4>
                        <p style={{ margin: '0 0 4px 0', fontSize: '11px' }}>
                          <strong>Incidents:</strong> {cl.incident_count.toLocaleString()}
                        </p>
                        <p style={{ margin: '0 0 6px 0', fontSize: '11px' }}>
                          <strong>Dominant Category:</strong> {cl.dominant_crime || 'N/A'}
                        </p>
                        {match && (
                          <div style={{ fontSize: '11px', fontWeight: 600, color: color }}>
                            Status: {match.match_classification}
                            {match.centroid_distance_meters !== null && ` (${match.centroid_distance_meters}m displacement)`}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        {/* MAP B: COMPARISON PERIOD */}
        <div style={{
          background: 'var(--bg-elevated, #101B2E)',
          borderRadius: '10px',
          border: '1px solid rgba(53, 184, 232, 0.35)',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--lake-blue, #35B8E8)' }} />
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#EAF2FF' }}>
                Period B: {periodBLabel} ({clustersB.length} Clusters)
              </h4>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--lake-blue, #35B8E8)', fontFamily: 'monospace' }}>
              Comparison Clusters
            </span>
          </div>

          <div style={{ height: '420px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
            <MapContainer
              center={mapState.center}
              zoom={mapState.zoom}
              scrollWheelZoom={true}
              style={{ width: '100%', height: '100%', background: '#0B1423' }}
            >
              <MapSyncController
                center={mapState.center}
                zoom={mapState.zoom}
                onMove={handleMapMove}
                mapId="mapB"
                source={mapState.source}
              />
              {!tileError ? (
                <>
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                    attribution='&copy; <a href="https://www.esri.com/" target="_blank" rel="noreferrer">Esri</a>, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
                    maxNativeZoom={16}
                    maxZoom={18}
                    eventHandlers={{
                      tileerror: () => setTileError(true)
                    }}
                  />
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
                    attribution=""
                    maxNativeZoom={16}
                    maxZoom={18}
                    opacity={0.8}
                  />
                </>
              ) : (
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
                  className="nightfall-osm-tiles"
                  maxZoom={19}
                />
              )}

              {/* Cluster Extents (Convex Hulls) */}
              {clustersB.map((cl) => {
                const match = matchMapB[cl.cluster_id];
                const color = match ? getClassificationColor(match.match_classification) : '#35B8E8';
                const isSelected = selectedMatch && selectedMatch.period_b_cluster_id === cl.cluster_id;

                if (!cl.convex_hull || cl.convex_hull.length < 3) return null;
                return (
                  <Polygon
                    key={`hull-b-${cl.cluster_id}`}
                    positions={cl.convex_hull}
                    pathOptions={{
                      color: isSelected ? '#FFFFFF' : color,
                      fillColor: color,
                      fillOpacity: isSelected ? 0.45 : 0.2,
                      weight: isSelected ? 3 : 1.5,
                      dashArray: isSelected ? '4,4' : undefined
                    }}
                    eventHandlers={{
                      click: () => match && onSelectMatch(match)
                    }}
                  />
                );
              })}

              {/* Cluster Centroids */}
              {clustersB.map((cl) => {
                const match = matchMapB[cl.cluster_id];
                const color = match ? getClassificationColor(match.match_classification) : '#35B8E8';
                const isSelected = selectedMatch && selectedMatch.period_b_cluster_id === cl.cluster_id;
                const radius = Math.max(9, Math.min(26, Math.sqrt(cl.incident_count) * 0.8));

                return (
                  <CircleMarker
                    key={`cent-b-${cl.cluster_id}`}
                    center={[cl.centroid.lat, cl.centroid.lon]}
                    radius={isSelected ? radius + 4 : radius}
                    pathOptions={{
                      fillColor: color,
                      color: isSelected ? '#FFFFFF' : '#0B1423',
                      weight: isSelected ? 3 : 2,
                      fillOpacity: 0.9
                    }}
                    eventHandlers={{
                      click: () => match && onSelectMatch(match)
                    }}
                  >
                    <Tooltip direction="top" opacity={0.95}>
                      <div style={{ fontSize: '11px', color: '#0B1423', fontWeight: 600 }}>
                        <div style={{ fontWeight: 700, color: '#17365D' }}>{cl.cluster_label} (Period B)</div>
                        <div>Incidents: <strong>{cl.incident_count.toLocaleString()}</strong></div>
                        {match && (
                          <div style={{ marginTop: '2px', color: color, fontWeight: 700 }}>
                            {match.match_classification}
                            {match.centroid_distance_meters !== null && ` (${match.centroid_distance_meters}m)`}
                          </div>
                        )}
                      </div>
                    </Tooltip>
                    <Popup>
                      <div style={{ color: '#0B1423', padding: '4px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 700 }}>
                          {cl.cluster_label} (Period B)
                        </h4>
                        <p style={{ margin: '0 0 4px 0', fontSize: '11px' }}>
                          <strong>Incidents:</strong> {cl.incident_count.toLocaleString()}
                        </p>
                        <p style={{ margin: '0 0 6px 0', fontSize: '11px' }}>
                          <strong>Dominant Category:</strong> {cl.dominant_crime || 'N/A'}
                        </p>
                        {match && (
                          <div style={{ fontSize: '11px', fontWeight: 600, color: color }}>
                            Status: {match.match_classification}
                            {match.centroid_distance_meters !== null && ` (${match.centroid_distance_meters}m displacement)`}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

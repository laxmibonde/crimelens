import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Polygon,
  CircleMarker,
  Popup,
  Tooltip as LeafletTooltip,
  useMap
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Ensure window.L is defined before loading plugins
if (typeof window !== 'undefined') {
  window.L = L;
}
import 'leaflet.heat';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import {
  Layers,
  RotateCcw,
  Flame,
  Shield,
  MapPin,
  Sliders,
  Eye,
  EyeOff,
  Sparkles,
  Info
} from 'lucide-react';

const CHICAGO_CENTER = [41.8781, -87.6298];
// Expanded bounds to cover Greater Chicago without restricting viewport panning
const CHICAGO_BOUNDS = [
  [41.35, -88.50],
  [42.45, -87.05]
];

// Helper to recenter map only when user explicitly triggers reset
function MapController({ center, zoom, resetTrigger }) {
  const map = useMap();
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    map.setView(center, zoom, { animate: true });
  }, [resetTrigger]);

  return null;
}

// Subcomponent: Leaflet Heatmap Layer
function HeatmapLayer({ points, radius, blur, maxIntensity, visible }) {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (!visible || !points || points.length === 0) return;

    // Create Leaflet heat layer with Chicago Nightfall color gradient
    const heat = L.heatLayer(points, {
      radius: radius || 25,
      blur: blur || 18,
      max: maxIntensity || 0.8,
      maxZoom: 16,
      gradient: {
        0.2: '#17365D', // River Blue
        0.45: '#35B8E8', // Lake Blue
        0.75: '#E9B44C', // Amber
        1.0: '#E76F74'  // Alert Red
      }
    });

    heat.addTo(map);
    heatLayerRef.current = heat;

    return () => {
      if (heatLayerRef.current && map) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map, points, radius, blur, maxIntensity, visible]);

  return null;
}

// Subcomponent: Marker Cluster Layer for Geocoded Incidents
function IncidentClusterLayer({ incidents, visible, onSelectIncident }) {
  const map = useMap();
  const clusterGroupRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current = null;
    }

    if (!visible || !incidents || incidents.length === 0) return;

    const clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 45,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let sizeClass = 'marker-cluster-small';
        let bg = 'rgba(23, 54, 93, 0.85)';
        let border = '#35B8E8';

        if (count >= 100) {
          bg = 'rgba(231, 111, 116, 0.85)';
          border = '#E76F74';
        } else if (count >= 30) {
          bg = 'rgba(233, 180, 76, 0.85)';
          border = '#E9B44C';
        }

        return L.divIcon({
          html: `<div style="
            background: ${bg};
            border: 2px solid ${border};
            color: #EAF2FF;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 700;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            font-family: monospace;
          ">${count}</div>`,
          className: 'custom-cluster-icon',
          iconSize: [38, 38]
        });
      }
    });

    incidents.forEach((inc) => {
      if (!inc.lat || !inc.lon) return;

      const marker = L.circleMarker([inc.lat, inc.lon], {
        radius: 5,
        fillColor: inc.arrest ? '#2EC4B6' : (inc.domestic ? '#E76F74' : '#35B8E8'),
        color: '#0B1423',
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.8
      });

      const popupHtml = `
        <div style="font-family: inherit; font-size: 12px; color: #EAF2FF; min-width: 200px;">
          <div style="font-weight: 700; font-size: 13px; color: #35B8E8; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; margin-bottom: 6px;">
            ${inc.category}
          </div>
          <div style="color: #A0B2C6; font-size: 11px; margin-bottom: 4px;">
            ${inc.description || 'No description'}
          </div>
          <div style="font-family: monospace; font-size: 11px; color: #E9B44C; margin-bottom: 4px;">
            📍 ${inc.block}
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #A0B2C6; margin-top: 6px;">
            <span>📅 ${inc.date}</span>
            <span>🕒 ${inc.time_period || inc.hour + ':00'}</span>
          </div>
          <div style="display: flex; gap: 6px; margin-top: 8px;">
            <span style="background: ${inc.arrest ? 'rgba(46,196,182,0.2)' : 'rgba(160,178,198,0.1)'}; color: ${inc.arrest ? '#2EC4B6' : '#A0B2C6'}; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">
              ${inc.arrest ? '✓ Arrest Made' : 'No Arrest'}
            </span>
            ${inc.domestic ? '<span style="background: rgba(231,111,116,0.2); color: #E76F74; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">Domestic</span>' : ''}
            <span style="background: rgba(53,184,232,0.15); color: #35B8E8; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: auto;">
              Dist ${inc.district}
            </span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        className: 'chicago-nightfall-popup',
        maxWidth: 280
      });

      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    return () => {
      if (clusterGroupRef.current && map) {
        map.removeLayer(clusterGroupRef.current);
        clusterGroupRef.current = null;
      }
    };
  }, [map, incidents, visible]);

  return null;
}

export default function ChicagoAreaMap({
  boundaries,
  districtsSummary,
  incidents,
  heatmapPoints,
  hotspots,
  selectedDistrictId,
  onSelectDistrict,
  areaIdA,
  areaIdB,
  loading
}) {
  const [resetCount, setResetCount] = useState(0);

  // Layer Toggles
  const [showChoropleth, setShowChoropleth] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showClusters, setShowClusters] = useState(false);
  const [showHotspots, setShowHotspots] = useState(false);

  // Heatmap Parameters
  const [heatRadius, setHeatRadius] = useState(25);
  const [heatBlur, setHeatBlur] = useState(18);
  const [heatIntensity, setHeatIntensity] = useState(0.8);
  const [showHeatControls, setShowHeatControls] = useState(false);

  // Calculate Choropleth Quantile Thresholds
  const { minVal, maxVal, tiers } = useMemo(() => {
    if (!districtsSummary || !districtsSummary.district_list || districtsSummary.district_list.length === 0) {
      return { minVal: 0, maxVal: 100, tiers: [20, 40, 60, 80] };
    }
    const counts = districtsSummary.district_list.map((d) => d.total_incidents).sort((a, b) => a - b);
    const min = counts[0];
    const max = counts[counts.length - 1];

    const q = (pct) => counts[Math.floor(pct * (counts.length - 1))];
    return {
      minVal: min,
      maxVal: max,
      tiers: [q(0.20), q(0.40), q(0.60), q(0.80)]
    };
  }, [districtsSummary]);

  // Color generator for Choropleth
  const getDistrictColor = (districtNum) => {
    if (!districtsSummary || !districtsSummary.districts_data) return '#17365D';
    const key = String(districtNum).trim();
    const data = districtsSummary.districts_data[key] ||
                 districtsSummary.districts_data[key.padStart(3, '0')] ||
                 districtsSummary.districts_data[key.replace(/^0+/, '')];
    
    if (!data) return '#101B2E';
    const val = data.total_incidents;

    if (val < tiers[0]) return '#13283E'; // Low volume (River shadow)
    if (val < tiers[1]) return '#1C3F65'; // Moderate low
    if (val < tiers[2]) return '#265787'; // Medium
    if (val < tiers[3]) return '#B88230'; // High (Amber)
    return '#D9534F';                     // Highest (Alert Red)
  };

  // GeoJSON District Styling
  const districtStyle = (feature) => {
    const distNum = feature?.properties?.DIST_NUM || feature?.properties?.dist_num;
    const isSelected = String(distNum).trim() === String(selectedDistrictId).trim() ||
                       String(distNum).padStart(3, '0') === String(selectedDistrictId).trim();
    const isAreaA = String(distNum).trim() === String(areaIdA).trim() ||
                    String(distNum).padStart(3, '0') === String(areaIdA).trim();
    const isAreaB = String(distNum).trim() === String(areaIdB).trim() ||
                    String(distNum).padStart(3, '0') === String(areaIdB).trim();

    let strokeColor = '#35B8E8'; // Lake blue default
    let strokeWidth = 1.2;
    let fillOpacity = 0.65;

    if (isSelected) {
      strokeColor = '#FFFFFF';
      strokeWidth = 3;
      fillOpacity = 0.85;
    } else if (isAreaA) {
      strokeColor = '#818cf8';
      strokeWidth = 2.5;
      fillOpacity = 0.8;
    } else if (isAreaB) {
      strokeColor = '#35B8E8';
      strokeWidth = 2.5;
      fillOpacity = 0.8;
    }

    return {
      fillColor: showChoropleth ? getDistrictColor(distNum) : 'transparent',
      weight: strokeWidth,
      opacity: 0.9,
      color: strokeColor,
      fillOpacity: showChoropleth ? fillOpacity : 0
    };
  };

  // GeoJSON Interactions
  const onEachDistrict = (feature, layer) => {
    const distNum = feature?.properties?.DIST_NUM || feature?.properties?.dist_num || '??';
    const label = feature?.properties?.DIST_LABEL || `District ${distNum}`;
    
    const key = String(distNum).trim();
    const summary = districtsSummary?.districts_data?.[key] ||
                    districtsSummary?.districts_data?.[key.padStart(3, '0')] ||
                    districtsSummary?.districts_data?.[key.replace(/^0+/, '')];

    const incidentCount = summary?.total_incidents?.toLocaleString() || '0';
    const sharePct = summary?.dataset_share_pct || '0.0';
    const arrestPct = summary?.arrest_pct || '0.0';
    const topCat = summary?.top_category || 'N/A';

    layer.bindTooltip(`
      <div style="font-family: inherit; font-size: 11.5px; color: #EAF2FF;">
        <div style="font-weight: 700; color: #35B8E8; margin-bottom: 2px;">
          ${label} (CPD #${distNum})
        </div>
        <div>Volume: <strong style="color: #FFFFFF;">${incidentCount}</strong> (${sharePct}% of warehouse volume)</div>
        <div>Arrest Rate: <strong style="color: #2EC4B6;">${arrestPct}%</strong></div>
        <div>Predominant: <strong style="color: #E9B44C;">${topCat}</strong></div>
      </div>
    `, { sticky: true, className: 'chicago-nightfall-tooltip' });

    layer.on({
      mouseover: (e) => {
        const l = e.target;
        l.setStyle({
          weight: 2.5,
          color: '#EAF2FF',
          fillOpacity: 0.85
        });
        l.bringToFront();
      },
      mouseout: (e) => {
        const l = e.target;
        districtStyle(feature);
        l.setStyle(districtStyle(feature));
      },
      click: () => {
        if (onSelectDistrict) {
          onSelectDistrict(distNum);
        }
      }
    });
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '560px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-subtle, rgba(53, 184, 232, 0.25))' }}>
      
      {/* Floating Map Control Bar */}
      <div style={{
        position: 'absolute',
        top: 14,
        right: 14,
        zIndex: 1000,
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        background: 'rgba(11, 20, 35, 0.90)',
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid rgba(53, 184, 232, 0.3)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        alignItems: 'center'
      }}>
        {/* Layer Toggles */}
        <button
          type="button"
          onClick={() => setShowChoropleth(!showChoropleth)}
          style={{
            background: showChoropleth ? 'rgba(53, 184, 232, 0.2)' : 'rgba(23, 54, 93, 0.4)',
            color: showChoropleth ? 'var(--lake-blue, #35B8E8)' : 'var(--text-muted, #7E92B0)',
            border: `1px solid ${showChoropleth ? 'var(--lake-blue, #35B8E8)' : 'rgba(255,255,255,0.1)'}`,
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <Layers size={13} />
          <span>Districts Choropleth</span>
        </button>

        <button
          type="button"
          onClick={() => setShowHeatmap(!showHeatmap)}
          style={{
            background: showHeatmap ? 'rgba(233, 180, 76, 0.2)' : 'rgba(23, 54, 93, 0.4)',
            color: showHeatmap ? 'var(--amber, #E9B44C)' : 'var(--text-muted, #7E92B0)',
            border: `1px solid ${showHeatmap ? 'var(--amber, #E9B44C)' : 'rgba(255,255,255,0.1)'}`,
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <Flame size={13} />
          <span>Density Heatmap</span>
        </button>

        {showHeatmap && (
          <button
            type="button"
            onClick={() => setShowHeatControls(!showHeatControls)}
            title="Adjust Heatmap Radius & Intensity"
            style={{
              background: showHeatControls ? 'rgba(233, 180, 76, 0.3)' : 'transparent',
              color: 'var(--amber, #E9B44C)',
              border: '1px solid rgba(233, 180, 76, 0.4)',
              padding: '5px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            <Sliders size={12} />
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowClusters(!showClusters)}
          title="Visual Leaflet marker clustering of up to 2,000 geocoded incident coordinates (distinct from algorithmic DBSCAN clusters)"
          style={{
            background: showClusters ? 'rgba(46, 196, 182, 0.2)' : 'rgba(23, 54, 93, 0.4)',
            color: showClusters ? '#2EC4B6' : 'var(--text-muted, #7E92B0)',
            border: `1px solid ${showClusters ? '#2EC4B6' : 'rgba(255,255,255,0.1)'}`,
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <MapPin size={13} />
          <span>Incident Markers ({incidents?.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setShowHotspots(!showHotspots)}
          title="Algorithmic density-based spatial clusters (DBSCAN) with convex hulls and centroids"
          style={{
            background: showHotspots ? 'rgba(231, 111, 116, 0.2)' : 'rgba(23, 54, 93, 0.4)',
            color: showHotspots ? 'var(--alert-red, #E76F74)' : 'var(--text-muted, #7E92B0)',
            border: `1px solid ${showHotspots ? 'var(--alert-red, #E76F74)' : 'rgba(255,255,255,0.1)'}`,
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <Sparkles size={13} />
          <span>DBSCAN Overlay</span>
        </button>

        {/* Recenter Button */}
        <button
          type="button"
          onClick={() => setResetCount((c) => c + 1)}
          title="Reset map view to downtown Chicago"
          style={{
            background: 'transparent',
            color: 'var(--text-dim, #5D728F)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '5px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <RotateCcw size={12} />
          <span>Reset</span>
        </button>
      </div>

      {/* Heatmap Slider Panel */}
      {showHeatmap && showHeatControls && (
        <div style={{
          position: 'absolute',
          top: 60,
          right: 14,
          zIndex: 1000,
          background: 'rgba(11, 20, 35, 0.95)',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid rgba(233, 180, 76, 0.35)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          fontSize: '11px',
          color: '#EAF2FF',
          width: '220px'
        }}>
          <div style={{ fontWeight: 700, color: 'var(--amber, #E9B44C)', marginBottom: '8px' }}>
            Density Heatmap Tuning
          </div>
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>Radius:</span>
              <span style={{ fontFamily: 'monospace' }}>{heatRadius}px</span>
            </div>
            <input
              type="range"
              min="10"
              max="50"
              value={heatRadius}
              onChange={(e) => setHeatRadius(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: 'var(--amber, #E9B44C)' }}
            />
          </div>
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>Blur:</span>
              <span style={{ fontFamily: 'monospace' }}>{heatBlur}px</span>
            </div>
            <input
              type="range"
              min="10"
              max="35"
              value={heatBlur}
              onChange={(e) => setHeatBlur(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: 'var(--amber, #E9B44C)' }}
            />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>Intensity Cap:</span>
              <span style={{ fontFamily: 'monospace' }}>{heatIntensity}</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="1.5"
              step="0.1"
              value={heatIntensity}
              onChange={(e) => setHeatIntensity(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--amber, #E9B44C)' }}
            />
          </div>
        </div>
      )}

      {/* Floating Choropleth Legend */}
      {showChoropleth && (
        <div style={{
          position: 'absolute',
          bottom: 18,
          left: 18,
          zIndex: 1000,
          background: 'rgba(11, 20, 35, 0.92)',
          padding: '10px 14px',
          borderRadius: '8px',
          border: '1px solid rgba(53, 184, 232, 0.3)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          fontSize: '11px',
          color: '#EAF2FF'
        }}>
          <div style={{ fontWeight: 700, fontSize: '11.5px', color: 'var(--lake-blue, #35B8E8)', marginBottom: '6px' }}>
            District Incident Volume
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '14px', height: '10px', background: '#D9534F', borderRadius: '2px' }} />
              <span>≥ {tiers[3]?.toLocaleString()} (Tier 5: Highest)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '14px', height: '10px', background: '#B88230', borderRadius: '2px' }} />
              <span>{tiers[2]?.toLocaleString()} – {(tiers[3] - 1)?.toLocaleString()} (Tier 4)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '14px', height: '10px', background: '#265787', borderRadius: '2px' }} />
              <span>{tiers[1]?.toLocaleString()} – {(tiers[2] - 1)?.toLocaleString()} (Tier 3)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '14px', height: '10px', background: '#1C3F65', borderRadius: '2px' }} />
              <span>{tiers[0]?.toLocaleString()} – {(tiers[1] - 1)?.toLocaleString()} (Tier 2)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '14px', height: '10px', background: '#13283E', borderRadius: '2px' }} />
              <span>&lt; {tiers[0]?.toLocaleString()} (Tier 1: Lowest)</span>
            </div>
          </div>
          <div style={{ fontSize: '9.5px', color: 'var(--text-dim, #5D728F)', marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '4px' }}>
            Source: CPD Districts (EPSG:4326) • 761,718 Census
          </div>
        </div>
      )}

      {/* Floating Heatmap Gradient Legend */}
      {showHeatmap && !showChoropleth && (
        <div style={{
          position: 'absolute',
          bottom: 18,
          left: 18,
          zIndex: 1000,
          background: 'rgba(11, 20, 35, 0.92)',
          padding: '10px 14px',
          borderRadius: '8px',
          border: '1px solid rgba(233, 180, 76, 0.35)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          fontSize: '11px',
          color: '#EAF2FF',
          maxWidth: '260px'
        }}>
          <div style={{ fontWeight: 700, fontSize: '11.5px', color: 'var(--amber, #E9B44C)', marginBottom: '6px' }}>
            Density Heatmap Gradient
          </div>
          <div style={{
            height: '8px',
            width: '100%',
            borderRadius: '4px',
            background: 'linear-gradient(to right, #17365D, #35B8E8, #E9B44C, #E76F74)',
            marginBottom: '6px'
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted, #7E92B0)' }}>
            <span>Low (River Blue)</span>
            <span>Moderate (Cyan)</span>
            <span>High (Red)</span>
          </div>
        </div>
      )}

      {/* Actual Leaflet Map */}
      <MapContainer
        center={CHICAGO_CENTER}
        zoom={11}
        minZoom={10}
        maxZoom={16}
        maxBounds={CHICAGO_BOUNDS}
        maxBoundsViscosity={1.0}
        inertia={false}
        bounceAtZoomLimits={false}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', background: '#0B1423' }}
      >
        <MapController center={CHICAGO_CENTER} zoom={11} resetTrigger={resetCount} />

        {/* Esri World Dark Gray Canvas Base Tiles (Legitimate dark basemap without API key requirement) */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={16}
        />
        {/* Esri Reference Overlay (Streets & Context Labels) */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
          attribution=""
          maxZoom={16}
          opacity={0.85}
        />

        {/* 1. Official Chicago Police District Boundaries (Choropleth) */}
        {boundaries && boundaries.features && (
          <GeoJSON
            key={`geojson-${showChoropleth}-${selectedDistrictId}-${areaIdA}-${areaIdB}-${tiers.join('-')}`}
            data={boundaries}
            style={districtStyle}
            onEachFeature={onEachDistrict}
          />
        )}

        {/* 2. Density Heatmap Layer */}
        <HeatmapLayer
          points={heatmapPoints}
          radius={heatRadius}
          blur={heatBlur}
          maxIntensity={heatIntensity}
          visible={showHeatmap}
        />

        {/* 3. Clustered Incidents Layer */}
        <IncidentClusterLayer
          incidents={incidents}
          visible={showClusters}
        />

        {/* 4. DBSCAN Hotspot Clusters Overlay */}
        {showHotspots && hotspots && hotspots.map((cl) => {
          if (!cl.convex_hull || cl.convex_hull.length < 3) return null;
          return (
            <React.Fragment key={`hotspot-${cl.cluster_id}`}>
              <Polygon
                positions={cl.convex_hull}
                pathOptions={{
                  color: '#E76F74',
                  fillColor: '#E76F74',
                  fillOpacity: 0.25,
                  weight: 2,
                  dashArray: '4,4'
                }}
              >
                <LeafletTooltip sticky>
                  <div style={{ fontSize: '11px', color: '#EAF2FF' }}>
                    <div style={{ fontWeight: 700, color: '#E76F74' }}>
                      Hotspot Cluster #{cl.cluster_id}
                    </div>
                    <div>Volume: <strong>{cl.cluster_size}</strong> incidents</div>
                    <div>Primary: {cl.primary_crime_type || 'Multiple'}</div>
                  </div>
                </LeafletTooltip>
              </Polygon>

              {cl.centroid && cl.centroid.latitude && (
                <CircleMarker
                  center={[cl.centroid.latitude, cl.centroid.longitude]}
                  radius={7}
                  pathOptions={{
                    fillColor: '#E76F74',
                    color: '#FFFFFF',
                    weight: 2,
                    fillOpacity: 0.9
                  }}
                >
                  <Popup>
                    <div style={{ fontSize: '12px', color: '#EAF2FF' }}>
                      <strong>Hotspot #{cl.cluster_id} Centroid</strong>
                      <div>Size: {cl.cluster_size} incidents</div>
                      <div>Radius Density: {cl.density_category || 'Dense Core'}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Loading Overlay */}
      {loading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(11, 20, 35, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          gap: '10px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            border: '3px solid rgba(53, 184, 232, 0.2)',
            borderTop: '3px solid #35B8E8',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <span style={{ fontSize: '12px', color: '#EAF2FF', letterSpacing: '0.5px' }}>
            Querying Chicago Geospatial Warehouse...
          </span>
        </div>
      )}
    </div>
  );
}
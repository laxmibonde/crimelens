import React from 'react';
import { Sparkles, Activity, Database, Clock } from 'lucide-react';
import { useDataset } from '../context/DatasetContext';

export default function ChicagoSkylineHeader({
  title = "Command Center Analytics",
  subtitle = "Interactive analytical intelligence querying PostgreSQL Star Schema warehouse",
  badgeText = "CHICAGO HISTORICAL SAMPLE",
  actionElement = null
}) {
  const { dataset, isSynthetic } = useDataset();

  return (
    <div className="skyline-header-container">
      {/* Chicago Skyline SVG Silhouette Background */}
      <div className="skyline-svg-wrapper" aria-hidden="true">
        <svg
          viewBox="0 0 1200 160"
          preserveAspectRatio="none"
          className="skyline-svg"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Skyline Gradient */}
            <linearGradient id="skylineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#17365D" stopOpacity="0.45" />
              <stop offset="40%" stopColor="#35B8E8" stopOpacity="0.25" />
              <stop offset="70%" stopColor="#17365D" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0B1423" stopOpacity="0.2" />
            </linearGradient>

            {/* Lake Michigan / River Reflection Gradient */}
            <linearGradient id="riverReflectGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#35B8E8" stopOpacity="0.35" />
              <stop offset="30%" stopColor="#17365D" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0B1423" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Distant Buildings Layer */}
          <path
            d="
              M 0,160 
              L 0,110 L 25,110 L 25,95 L 45,95 L 45,115 L 70,115 L 70,85 L 90,85 L 90,120 
              L 120,120 L 120,70 L 140,70 L 140,120 L 170,120 L 170,90 L 195,90 L 195,120
              L 230,120 L 230,80 L 260,80 L 260,115 L 290,115 L 290,75 L 320,75 L 320,120
              L 360,120 L 360,65 L 385,65 L 385,120 L 410,120 L 410,85 L 435,85 L 435,120
              L 470,120 L 470,70 L 500,70 L 500,120 L 540,120 L 540,60 L 570,60 L 570,120
              L 610,120 L 610,80 L 640,80 L 640,120 L 675,120 L 675,75 L 700,75 L 700,120
              L 740,120 L 740,85 L 770,85 L 770,120 L 810,120 L 810,65 L 835,65 L 835,120
              L 870,120 L 870,90 L 900,90 L 900,120 L 935,120 L 935,70 L 960,70 L 960,120
              L 1000,120 L 1000,85 L 1030,85 L 1030,120 L 1070,120 L 1070,95 L 1110,95 L 1110,120
              L 1150,120 L 1150,105 L 1200,105 L 1200,160 Z
            "
            fill="#17365D"
            opacity="0.25"
          />

          {/* Prominent Iconic Landmarks Layer */}
          {/* John Hancock Center (X-bracing profile, trapezoid, dual spires at ~300) */}
          {/* Aon Center (tall white monolith at ~480) */}
          {/* Two Prudential Plaza (pyramidal stepped spire at ~550) */}
          {/* Willis (Sears) Tower (stepped setbacks with twin tall antennae at ~720) */}
          {/* Tribune Tower crown at ~860 */}
          <path
            d="
              M 0,160
              L 0,135 L 60,135 L 60,110 L 90,110 L 90,135
              L 140,135 L 140,100 L 180,100 L 180,135
              L 210,135 L 210,115 L 245,115 L 245,135
              L 280,135 
              L 283,50 L 287,50 L 287,18 L 288,18 L 288,50 L 297,50 L 297,18 L 298,18 L 298,50 L 302,50 L 305,135
              L 340,135 L 340,95 L 370,95 L 370,135
              L 410,135 L 410,105 L 440,105 L 440,135
              L 470,135 L 470,35 L 500,35 L 500,135
              L 530,135 L 530,65 L 542,42 L 543,15 L 544,42 L 556,65 L 556,135
              L 590,135 L 590,100 L 630,100 L 630,135
              L 660,135 L 660,110 L 685,110 L 685,135
              L 710,135 
              L 710,75 L 717,75 L 717,55 L 725,55 L 725,25 L 729,25 L 729,5 L 730,5 L 730,25 
              L 736,25 L 736,5 L 737,5 L 737,25 L 741,25 L 741,55 L 749,55 L 749,75 L 756,75 L 756,135
              L 790,135 L 790,95 L 820,95 L 820,135
              L 850,135 L 850,75 L 853,70 L 856,75 L 859,60 L 861,75 L 864,70 L 867,75 L 870,135
              L 910,135 L 910,105 L 945,105 L 945,135
              L 980,135 L 980,115 L 1020,115 L 1020,135
              L 1060,135 L 1060,120 L 1110,120 L 1110,135
              L 1150,135 L 1150,125 L 1200,125 L 1200,160 Z
            "
            fill="url(#skylineGrad)"
          />

          {/* Lake Michigan / Chicago River Waterline */}
          <line x1="0" y1="136" x2="1200" y2="136" stroke="#35B8E8" strokeWidth="1.2" strokeOpacity="0.4" />

          {/* Subtle Water Shimmer Lines */}
          <line x1="120" y1="142" x2="350" y2="142" stroke="#35B8E8" strokeWidth="0.8" strokeOpacity="0.25" strokeDasharray="16 8" />
          <line x1="450" y1="145" x2="780" y2="145" stroke="#35B8E8" strokeWidth="0.8" strokeOpacity="0.2" strokeDasharray="24 12" />
          <line x1="680" y1="149" x2="950" y2="149" stroke="#E9B44C" strokeWidth="0.7" strokeOpacity="0.25" strokeDasharray="12 16" />
          <line x1="220" y1="152" x2="520" y2="152" stroke="#35B8E8" strokeWidth="0.6" strokeOpacity="0.15" strokeDasharray="30 10" />

          {/* Water Reflection Gradient Wash */}
          <rect x="0" y="137" width="1200" height="23" fill="url(#riverReflectGrad)" />
        </svg>
      </div>

      {/* Content Overlay */}
      <div className="skyline-header-content">
        <div className="skyline-header-left">
          {/* Chicago 6-point Civic Star Motif */}
          <div className="chicago-civic-badge" title="Chicago Municipal Intelligence System">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              {/* Chicago Flag 6-point Star */}
              <polygon
                points="12,1 14.5,8 22,8 16.5,13 18.5,20.5 12,16 5.5,20.5 7.5,13 2,8 9.5,8"
                fill="#35B8E8"
                opacity="0.95"
              />
            </svg>
            <span className="civic-badge-text">{badgeText}</span>
          </div>

          <h1 className="skyline-title">{title}</h1>
          <p className="skyline-subtitle">{subtitle}</p>
        </div>

        {actionElement && (
          <div className="skyline-header-right">
            {actionElement}
          </div>
        )}
      </div>
    </div>
  );
}

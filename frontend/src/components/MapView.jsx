import React, { useState, useEffect } from 'react';
import { CircleMarker, MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Standard Leaflet marker fix
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let defaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Sleek glowing pulse marker icon for smart city theme
const createGlowingIcon = (status) => {
  let color = '#3b82f6'; // Blue for pending
  if (status === 'Approved') color = '#10b981'; // Emerald
  if (status === 'Rejected') color = '#ef4444'; // Red
  
  return L.divIcon({
    className: 'custom-gps-marker',
    html: `
      <div class="relative flex items-center justify-center h-8 w-8">
        <div class="absolute h-5 w-5 rounded-full opacity-45 animate-ping" style="background-color: ${color};"></div>
        <div class="h-3.5 w-3.5 rounded-full border-2 border-white shadow shadow-black" style="background-color: ${color};"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

// Component to handle map clicks for coordinate selection
const LocationMarker = ({ position, setPosition, onPositionChange }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      if (onPositionChange) {
        onPositionChange(lat, lng);
      }
    },
  });

  return position === null ? null : (
    <Marker 
      position={position} 
      icon={defaultIcon}
      draggable={true}
      eventHandlers={{
        dragend(e) {
          const marker = e.target;
          const pos = marker.getLatLng();
          setPosition([pos.lat, pos.lng]);
          if (onPositionChange) {
            onPositionChange(pos.lat, pos.lng);
          }
        }
      }}
    >
      <Popup>
        <span className="text-xs font-semibold text-slate-800">
          Incident Location Pinpoint<br/>
          (Drag to adjust GPS)
        </span>
      </Popup>
    </Marker>
  );
};

export const MapView = ({ 
  violations = [], 
  heatmapPoints = [],
  interactive = false, 
  onLocationSelect = null, 
  center = [40.73061, -73.93524], // Default smart-city coordinates (St. Jude Hospital area)
  zoom = 13 
}) => {
  const [selectedPosition, setSelectedPosition] = useState(null);

  useEffect(() => {
    if (interactive && !selectedPosition) {
      setSelectedPosition(center);
      if (onLocationSelect) {
        onLocationSelect(center[0], center[1]);
      }
    }
  }, [interactive, center]);

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden shadow-inner border border-slate-800">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Interactive Pin Drop Mode */}
        {interactive && (
          <LocationMarker 
            position={selectedPosition} 
            setPosition={setSelectedPosition} 
            onPositionChange={onLocationSelect} 
          />
        )}

        {/* Display list of violations */}
        {!interactive && violations.map((v) => {
          if (v.latitude && v.longitude) {
            return (
              <Marker
                key={v.id}
                position={[v.latitude, v.longitude]}
                icon={createGlowingIcon(v.review_status)}
              >
                <Popup>
                  <div className="text-slate-200 text-xs p-1">
                    <div className="font-bold text-slate-100 uppercase tracking-wide border-b border-slate-700 pb-1 mb-1">
                      {v.violation_type}
                    </div>
                    <div className="space-y-0.5">
                      <div><b>Vehicle:</b> {v.vehicle?.vehicle_number || 'Unrecognized'}</div>
                      <div><b>Confidence:</b> {parseInt(v.confidence * 100)}%</div>
                      <div><b>Status:</b> <span className={v.review_status === 'Approved' ? 'text-emerald-400 font-bold' : v.review_status === 'Rejected' ? 'text-rose-400 font-bold' : 'text-amber-400 font-bold'}>{v.review_status}</span></div>
                    </div>
                    {v.pdf_report && (
                      <a 
                        href={`/history?id=${v.id}`}
                        className="mt-2 block text-center bg-brand-600 hover:bg-brand-500 text-white rounded py-1 px-2 font-semibold text-[10px] transition-colors"
                      >
                        Inspect Report
                      </a>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          }
          return null;
        })}

        {!interactive && heatmapPoints.map((point, idx) => {
          const radius = Math.min(34, 8 + point.intensity * 4);
          return (
            <CircleMarker
              key={`${point.latitude}-${point.longitude}-${idx}`}
              center={[point.latitude, point.longitude]}
              radius={radius}
              pathOptions={{
                color: '#f97316',
                fillColor: '#ef4444',
                fillOpacity: 0.22,
                weight: 1,
              }}
            >
              <Popup>
                <div className="text-slate-200 text-xs p-1">
                  <div className="font-bold text-slate-100 uppercase tracking-wide border-b border-slate-700 pb-1 mb-1">
                    Heatmap Hotspot
                  </div>
                  <div><b>Location:</b> {point.label}</div>
                  <div><b>Incidents:</b> {point.intensity}</div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapView;

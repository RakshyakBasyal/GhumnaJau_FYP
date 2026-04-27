// frontend/src/components/admin/LocationPicker.jsx
import { useEffect, useRef } from 'react';
import { MapPin, X } from 'lucide-react';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const TILE_URL    = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTR   = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

// Leaflet marker images hosted on CDN — bypasses webpack asset rewriting entirely
const ICON_URL    = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const ICON_2X_URL = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const SHADOW_URL  = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const DEFAULT_LAT  = 27.7172;
const DEFAULT_LNG  = 85.3240;
const DEFAULT_ZOOM = 11;

function loadLeaflet() {
  return new Promise((resolve) => {
    if (window.L) { resolve(window.L); return; }
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.onload = () => resolve(window.L);
    document.head.appendChild(script);
  });
}

// Creates a standard blue Leaflet marker icon using explicit CDN URLs.
// L.icon() does NOT go through webpack so the paths are never rewritten.
function createMarkerIcon(L) {
  return L.icon({
    iconUrl:      ICON_URL,
    iconRetinaUrl:ICON_2X_URL,
    shadowUrl:    SHADOW_URL,
    iconSize:     [25, 41],
    iconAnchor:   [12, 41],
    popupAnchor:  [1, -34],
    shadowSize:   [41, 41],
  });
}

export default function LocationPicker({ lat, lng, onChange, onClear }) {
  const mapRef      = useRef(null);
  const markerRef   = useRef(null);
  const iconRef     = useRef(null);
  const onChangeRef = useRef(onChange);

  // Always keep onChangeRef current so click handler never goes stale
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const MAP_ID = 'hotel-picker-map';

  // Mount map exactly once
  useEffect(() => {
    let isMounted = true;

    loadLeaflet().then((L) => {
      if (!isMounted) return;
      const container = document.getElementById(MAP_ID);
      if (!container) return;

      try {
        // Destroy any previous Leaflet instance on this container
        if (container._leaflet_id) {
          container._leaflet_id = null;
          container.innerHTML   = '';
        }

        iconRef.current = createMarkerIcon(L);

        const map = L.map(MAP_ID, {
          center:      [lat || DEFAULT_LAT, lng || DEFAULT_LNG],
          zoom:         lat ? 15 : DEFAULT_ZOOM,
          zoomControl:  true,
        });
        mapRef.current = map;

        L.tileLayer(TILE_URL, {
          attribution:  TILE_ATTR,
          subdomains:   'abcd',
          maxZoom:      19,
        }).addTo(map);

        // Place existing pin if hotel already has coordinates
        if (lat && lng) {
          const m = L.marker([lat, lng], {
            draggable: true,
            icon:      iconRef.current,
          }).addTo(map);
          m.on('dragend', () => {
            const p = m.getLatLng();
            onChangeRef.current(p.lat, p.lng);
          });
          markerRef.current = m;
        }

        // Click anywhere on map → place or move pin
        map.on('click', (e) => {
          const { lat: la, lng: ln } = e.latlng;

          if (markerRef.current) {
            markerRef.current.setLatLng([la, ln]);
          } else {
            const m = L.marker([la, ln], {
              draggable: true,
              icon:      iconRef.current,
            }).addTo(map);
            m.on('dragend', () => {
              const p = m.getLatLng();
              onChangeRef.current(p.lat, p.lng);
            });
            markerRef.current = m;
          }

          onChangeRef.current(la, ln);
        });
      } catch (err) {
        console.error('Leaflet map initialization error:', err);
      }
    });

    return () => {
      isMounted = false;
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (_) {}
        mapRef.current    = null;
        markerRef.current = null;
        iconRef.current   = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When parent calls onClear() → lat & lng become null → remove marker
  useEffect(() => {
    if (!mapRef.current) return;
    if (!lat && !lng && markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [lat, lng]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-sm">
          <MapPin size={13} className="text-blue-600" />
          {lat && lng
            ? <span className="text-green-700 font-medium">
                Pin set — {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
              </span>
            : <span className="text-gray-400">Click anywhere on the map to drop a pin</span>}
        </div>
        {lat && lng && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-0.5 rounded hover:bg-red-50 transition"
          >
            <X size={11} /> Remove
          </button>
        )}
      </div>

      <div
        id={MAP_ID}
        style={{
          height:       240,
          width:        '100%',
          borderRadius:  8,
          border:       '1px solid #e5e7eb',
          zIndex:        0,
        }}
      />

      <p className="text-xs text-gray-400 mt-1">
        Click to place · Drag to fine-tune · Scroll to zoom
      </p>
    </div>
  );
}
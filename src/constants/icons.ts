import L from 'leaflet';

// Fix for missing marker icons in production
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Default icon for regular markers
export const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom icons for inspectable, non-inspectable and pending approval points
export const greenIcon = L.icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export const redIcon = L.icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export const yellowIcon = L.icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom icons for historical POIs (magenta for 2024, blue for 2025)
export const magentaIcon = L.icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export const darkGreyIcon = L.icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Large icons for POI currently being worked on (double size) - maintaining original colors
export const largeDefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [50, 82], // Double the size
  iconAnchor: [25, 82], // Adjusted anchor point
  popupAnchor: [1, -82], // Adjusted popup anchor
  shadowSize: [82, 82] // Double shadow size
});

export const largeGreenIcon = L.icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [50, 82], // Double the size
  iconAnchor: [25, 82], // Adjusted anchor point
  popupAnchor: [1, -82], // Adjusted popup anchor
  shadowSize: [82, 82] // Double shadow size
});

export const largeRedIcon = L.icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [50, 82], // Double the size
  iconAnchor: [25, 82], // Adjusted anchor point
  popupAnchor: [1, -82], // Adjusted popup anchor
  shadowSize: [82, 82] // Double shadow size
});

export const largeYellowIcon = L.icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [50, 82], // Double the size
  iconAnchor: [25, 82], // Adjusted anchor point
  popupAnchor: [1, -82], // Adjusted popup anchor
  shadowSize: [82, 82] // Double shadow size
});

export const largeMagentaIcon = L.icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [50, 82], // Double the size
  iconAnchor: [25, 82], // Adjusted anchor point
  popupAnchor: [1, -82], // Adjusted popup anchor
  shadowSize: [82, 82] // Double shadow size
});

export const largeDarkGreyIcon = L.icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [50, 82], // Double the size
  iconAnchor: [25, 82], // Adjusted anchor point
  popupAnchor: [1, -82], // Adjusted popup anchor
  shadowSize: [82, 82] // Double shadow size
});

// Custom circular icon for user's location with police officer
export const userLocationIcon = L.divIcon({
  html: `
    <div style="
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: #2563eb;
      border: 3px solid white;
      box-shadow: 0 3px 6px rgba(0,0,0,0.4);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    ">
      👮‍♂️
    </div>
  `,
  className: 'custom-user-location-icon',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -19]
});

// Construction site drop-shaped emoji icons
export const constructionGreenIcon = L.divIcon({
  html: `
    <div style="
      width: 32px;
      height: 40px;
      background-color: #22c55e;
      border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      color: white;
      text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
      position: relative;
    ">
      🏗️
      <div style="
        position: absolute;
        bottom: -2px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 8px solid #22c55e;
      "></div>
    </div>
  `,
  className: 'custom-construction-drop-icon',
  iconSize: [32, 48],
  iconAnchor: [16, 48],
  popupAnchor: [0, -48]
});

export const constructionRedIcon = L.divIcon({
  html: `
    <div style="
      width: 32px;
      height: 40px;
      background-color: #ef4444;
      border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      color: white;
      text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
      position: relative;
    ">
      🏗️
      <div style="
        position: absolute;
        bottom: -2px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 8px solid #ef4444;
      "></div>
    </div>
  `,
  className: 'custom-construction-drop-icon',
  iconSize: [32, 48],
  iconAnchor: [16, 48],
  popupAnchor: [0, -48]
});

export const constructionYellowIcon = L.divIcon({
  html: `
    <div style="
      width: 32px;
      height: 40px;
      background-color: #eab308;
      border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      color: white;
      text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
      position: relative;
    ">
      🏗️
      <div style="
        position: absolute;
        bottom: -2px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 8px solid #eab308;
      "></div>
    </div>
  `,
  className: 'custom-construction-drop-icon',
  iconSize: [32, 48],
  iconAnchor: [16, 48],
  popupAnchor: [0, -48]
});

export const constructionMagentaIcon = L.divIcon({
  html: `
    <div style="
      width: 32px;
      height: 40px;
      background-color: #d946ef;
      border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      color: white;
      text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
      position: relative;
    ">
      🏗️
      <div style="
        position: absolute;
        bottom: -2px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 8px solid #d946ef;
      "></div>
    </div>
  `,
  className: 'custom-construction-drop-icon',
  iconSize: [32, 48],
  iconAnchor: [16, 48],
  popupAnchor: [0, -48]
});

export const constructionDarkGreyIcon = L.divIcon({
  html: `
    <div style="
      width: 32px;
      height: 40px;
      background-color: #374151;
      border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      color: white;
      text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
      position: relative;
    ">
      🏗️
      <div style="
        position: absolute;
        bottom: -2px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 8px solid #374151;
      "></div>
    </div>
  `,
  className: 'custom-construction-drop-icon',
  iconSize: [32, 48],
  iconAnchor: [16, 48],
  popupAnchor: [0, -48]
});

// Large construction site drop-shaped emoji icons
export const largeConstructionGreenIcon = L.divIcon({
  html: `
    <div style="
      width: 48px;
      height: 60px;
      background-color: #22c55e;
      border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
      border: 3px solid white;
      box-shadow: 0 3px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: white;
      text-shadow: 2px 2px 2px rgba(0,0,0,0.6);
      position: relative;
    ">
      🏗️
      <div style="
        position: absolute;
        bottom: -3px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 9px solid transparent;
        border-right: 9px solid transparent;
        border-top: 12px solid #22c55e;
      "></div>
    </div>
  `,
  className: 'custom-construction-drop-icon-large',
  iconSize: [48, 72],
  iconAnchor: [24, 72],
  popupAnchor: [0, -72]
});

export const largeConstructionRedIcon = L.divIcon({
  html: `
    <div style="
      width: 48px;
      height: 60px;
      background-color: #ef4444;
      border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
      border: 3px solid white;
      box-shadow: 0 3px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: white;
      text-shadow: 2px 2px 2px rgba(0,0,0,0.6);
      position: relative;
    ">
      🏗️
      <div style="
        position: absolute;
        bottom: -3px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 9px solid transparent;
        border-right: 9px solid transparent;
        border-top: 12px solid #ef4444;
      "></div>
    </div>
  `,
  className: 'custom-construction-drop-icon-large',
  iconSize: [48, 72],
  iconAnchor: [24, 72],
  popupAnchor: [0, -72]
});

export const largeConstructionYellowIcon = L.divIcon({
  html: `
    <div style="
      width: 48px;
      height: 60px;
      background-color: #eab308;
      border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
      border: 3px solid white;
      box-shadow: 0 3px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: white;
      text-shadow: 2px 2px 2px rgba(0,0,0,0.6);
      position: relative;
    ">
      🏗️
      <div style="
        position: absolute;
        bottom: -3px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 9px solid transparent;
        border-right: 9px solid transparent;
        border-top: 12px solid #eab308;
      "></div>
    </div>
  `,
  className: 'custom-construction-drop-icon-large',
  iconSize: [48, 72],
  iconAnchor: [24, 72],
  popupAnchor: [0, -72]
});

export const largeConstructionMagentaIcon = L.divIcon({
  html: `
    <div style="
      width: 48px;
      height: 60px;
      background-color: #d946ef;
      border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
      border: 3px solid white;
      box-shadow: 0 3px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: white;
      text-shadow: 2px 2px 2px rgba(0,0,0,0.6);
      position: relative;
    ">
      🏗️
      <div style="
        position: absolute;
        bottom: -3px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 9px solid transparent;
        border-right: 9px solid transparent;
        border-top: 12px solid #d946ef;
      "></div>
    </div>
  `,
  className: 'custom-construction-drop-icon-large',
  iconSize: [48, 72],
  iconAnchor: [24, 72],
  popupAnchor: [0, -72]
});

export const largeConstructionDarkGreyIcon = L.divIcon({
  html: `
    <div style="
      width: 48px;
      height: 60px;
      background-color: #374151;
      border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
      border: 3px solid white;
      box-shadow: 0 3px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: white;
      text-shadow: 2px 2px 2px rgba(0,0,0,0.6);
      position: relative;
    ">
      🏗️
      <div style="
        position: absolute;
        bottom: -3px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 9px solid transparent;
        border-right: 9px solid transparent;
        border-top: 12px solid #374151;
      "></div>
    </div>
  `,
  className: 'custom-construction-drop-icon-large',
  iconSize: [48, 72],
  iconAnchor: [24, 72],
  popupAnchor: [0, -72]
});

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

// Construction site icons using standard marker shape with construction emoji overlay
export const constructionGreenIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 25px; height: 41px;">
      <img src="https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png"
           style="width: 100%; height: 100%; position: absolute; top: 0; left: 0;" />
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 12px;
        line-height: 1;
        color: white;
        text-shadow: 1px 1px 1px rgba(0,0,0,0.7);
        z-index: 1;
      ">🏗️</div>
    </div>
  `,
  className: 'custom-construction-marker',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

export const constructionRedIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 25px; height: 41px;">
      <img src="https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png"
           style="width: 100%; height: 100%; position: absolute; top: 0; left: 0;" />
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 12px;
        line-height: 1;
        color: white;
        text-shadow: 1px 1px 1px rgba(0,0,0,0.7);
        z-index: 1;
      ">🏗️</div>
    </div>
  `,
  className: 'custom-construction-marker',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

export const constructionYellowIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 25px; height: 41px;">
      <img src="https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png"
           style="width: 100%; height: 100%; position: absolute; top: 0; left: 0;" />
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 12px;
        line-height: 1;
        color: white;
        text-shadow: 1px 1px 1px rgba(0,0,0,0.7);
        z-index: 1;
      ">🏗️</div>
    </div>
  `,
  className: 'custom-construction-marker',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

export const constructionMagentaIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 25px; height: 41px;">
      <img src="https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png"
           style="width: 100%; height: 100%; position: absolute; top: 0; left: 0;" />
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 12px;
        line-height: 1;
        color: white;
        text-shadow: 1px 1px 1px rgba(0,0,0,0.7);
        z-index: 1;
      ">🏗️</div>
    </div>
  `,
  className: 'custom-construction-marker',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

export const constructionDarkGreyIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 25px; height: 41px;">
      <img src="https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png"
           style="width: 100%; height: 100%; position: absolute; top: 0; left: 0;" />
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 12px;
        line-height: 1;
        color: white;
        text-shadow: 1px 1px 1px rgba(0,0,0,0.7);
        z-index: 1;
      ">🏗️</div>
    </div>
  `,
  className: 'custom-construction-marker',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

// Large construction site icons using standard large marker shape with construction emoji overlay
export const largeConstructionGreenIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 50px; height: 82px;">
      <img src="https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png"
           style="width: 100%; height: 100%; position: absolute; top: 0; left: 0;" />
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 18px;
        line-height: 1;
        color: white;
        text-shadow: 2px 2px 2px rgba(0,0,0,0.8);
        z-index: 1;
      ">🏗️</div>
    </div>
  `,
  className: 'custom-construction-marker-large',
  iconSize: [50, 82],
  iconAnchor: [25, 82],
  popupAnchor: [1, -82]
});

export const largeConstructionRedIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 50px; height: 82px;">
      <img src="https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png"
           style="width: 100%; height: 100%; position: absolute; top: 0; left: 0;" />
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 18px;
        line-height: 1;
        color: white;
        text-shadow: 2px 2px 2px rgba(0,0,0,0.8);
        z-index: 1;
      ">🏗️</div>
    </div>
  `,
  className: 'custom-construction-marker-large',
  iconSize: [50, 82],
  iconAnchor: [25, 82],
  popupAnchor: [1, -82]
});

export const largeConstructionYellowIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 50px; height: 82px;">
      <img src="https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png"
           style="width: 100%; height: 100%; position: absolute; top: 0; left: 0;" />
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 18px;
        line-height: 1;
        color: white;
        text-shadow: 2px 2px 2px rgba(0,0,0,0.8);
        z-index: 1;
      ">🏗️</div>
    </div>
  `,
  className: 'custom-construction-marker-large',
  iconSize: [50, 82],
  iconAnchor: [25, 82],
  popupAnchor: [1, -82]
});

export const largeConstructionMagentaIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 50px; height: 82px;">
      <img src="https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png"
           style="width: 100%; height: 100%; position: absolute; top: 0; left: 0;" />
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 18px;
        line-height: 1;
        color: white;
        text-shadow: 2px 2px 2px rgba(0,0,0,0.8);
        z-index: 1;
      ">🏗️</div>
    </div>
  `,
  className: 'custom-construction-marker-large',
  iconSize: [50, 82],
  iconAnchor: [25, 82],
  popupAnchor: [1, -82]
});

export const largeConstructionDarkGreyIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 50px; height: 82px;">
      <img src="https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png"
           style="width: 100%; height: 100%; position: absolute; top: 0; left: 0;" />
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 18px;
        line-height: 1;
        color: white;
        text-shadow: 2px 2px 2px rgba(0,0,0,0.8);
        z-index: 1;
      ">🏗️</div>
    </div>
  `,
  className: 'custom-construction-marker-large',
  iconSize: [50, 82],
  iconAnchor: [25, 82],
  popupAnchor: [1, -82]
});

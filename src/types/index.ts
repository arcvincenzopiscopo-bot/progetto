// Core types for the POI application

export interface PointOfInterest {
  id: string;
  indirizzo: string;
  username: string;
  team: string;
  ispezionabile: number; // 0 = not inspectable, 1 = inspectable, 2 = pending approval
  tipo: string;
  note?: string;
  latitudine: number;
  longitudine: number;
  da_approvare?: number;
  photo_url?: string;
  created_at: string;
  data_inattivita?: string;
  anno?: number; // For historical POIs (2024, 2025)
}

export interface GeocodingResult {
  success: boolean;
  address?: string;
  fullAddress?: string;
  error?: string;
  rawData?: any;
}

export interface SearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
    [key: string]: string | undefined;
  };
  importance?: number;
  boundingbox?: string[];
}

export interface FilterState {
  showInspectable: boolean;
  showNonInspectable: boolean;
  showPendingApproval: boolean;
  showCantiere: boolean;
  showAltro: boolean;
  show2024: boolean;
  show2025: boolean;
  showToday: boolean;
}

export interface User {
  id: string;
  username: string;
  team: string;
  admin: number; // 0 = user, 1 = team leader, 2 = superadmin
  needsPasswordChange?: boolean;
}

export interface MapComponentProps {
  pois: PointOfInterest[];
  onMapClick: (lat: number, lng: number) => void;
  selectedPoi?: PointOfInterest | null;
  initialPosition?: [number, number];
  mapCenter?: [number, number] | null;
  mapZoom?: number;
  onPoiUpdated?: (poiPosition?: [number, number], zoomLevel?: number, workingPoiId?: string) => void;
  onPoiSelect?: (poi: PointOfInterest | null) => void;
  currentTeam?: string;
  adminLevel?: number;
  currentUsername?: string;
  newPoiLocation?: { lat: number; lng: number } | null;
  onAddPoi?: (indirizzo: string, ispezionabile: number, tipo: string, note?: string, photo?: File) => void;
  onCancelAddPoi?: () => void;
  filterShowInspectable?: boolean;
  filterShowNonInspectable?: boolean;
  filterShowPendingApproval?: boolean;
  filterShowCantiere?: boolean;
  filterShowAltro?: boolean;
  filterShow2024?: boolean;
  filterShow2025?: boolean;
  filterShowToday?: boolean;
  height?: string;
  workingPoiId?: string | null;
  selectedPoiId?: string | null;
  creatingNewPoi?: boolean;
}

export interface POIFormData {
  indirizzo: string;
  ispezionabile: number;
  tipo: string;
  note?: string;
  photo?: File;
}

export type POIStatus = 0 | 1 | 2; // 0 = not inspectable, 1 = inspectable, 2 = pending approval
export type UserRole = 0 | 1 | 2; // 0 = user, 1 = team leader, 2 = superadmin
export type POITipo = 'cantiere' | 'altro';

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string;
  data?: any;
}

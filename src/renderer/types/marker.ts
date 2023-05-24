export interface MarkerProps {
  id: string;
  html: string;
  lng: number;
  lat: number;
  onClick?: (id: string) => void;
  offset?: [number, number];
}

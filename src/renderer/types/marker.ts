export interface MarkerProps {
  id: string;
  html: string;
  lng: number;
  lat: number;
  offset: [number, number];
  onClick: (id: string) => void;
}

export type VehicleType = 'car' | 'bike';

export interface Part {
  id: string;
  name: string;
  category: 'engine' | 'tires' | 'exhaust' | 'suspension' | 'body';
  price: number;
  performanceBoost: number;
  appealBoost: number;
}

export interface Customization {
  color: string;
  installedParts: string[]; // IDs of parts
}

export interface Vehicle {
  id: string;
  modelId: string;
  type: VehicleType;
  name: string;
  basePrice: number;
  condition: number; // 0 to 1 (0 is junk, 1 is mint)
  customization: Customization;
  purchasePrice: number;
}

export interface VehicleModel {
  id: string;
  name: string;
  type: VehicleType;
  basePrice: number;
  image: string;
  description: string;
}

export interface GameState {
  money: number;
  inventory: Vehicle[];
  marketplace: Vehicle[];
  day: number;
}

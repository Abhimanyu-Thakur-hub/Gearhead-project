import { VehicleModel, Part } from './types';

export const VEHICLE_MODELS: VehicleModel[] = [
  {
    id: 'car-1',
    name: 'Rusty Sedan',
    type: 'car',
    basePrice: 2500,
    image: '🚗',
    description: 'A reliable but worn-out family car. Great for beginners.'
  },
  {
    id: 'car-2',
    name: 'Sport Coupe',
    type: 'car',
    basePrice: 8000,
    image: '🏎️',
    description: 'Sleek lines and a powerful engine. High potential for profit.'
  },
  {
    id: 'car-3',
    name: 'Vintage Muscle',
    type: 'car',
    basePrice: 15000,
    image: '🚘',
    description: 'A classic beast. Restoring this will take time and money.'
  },
  {
    id: 'car-4',
    name: 'Off-Road Beast',
    type: 'car',
    basePrice: 12000,
    image: '🚜',
    description: 'Built for the dirt. Rugged and ready for a lift kit.'
  },
  {
    id: 'car-5',
    name: 'Electric Stealth',
    type: 'car',
    basePrice: 25000,
    image: '🏎️',
    description: 'Silent but deadly. The future of performance.'
  },
  {
    id: 'bike-1',
    name: 'Street Scrambler',
    type: 'bike',
    basePrice: 1500,
    image: '🏍️',
    description: 'Lightweight and agile. Perfect for city custom builds.'
  },
  {
    id: 'bike-2',
    name: 'Heavy Cruiser',
    type: 'bike',
    basePrice: 5000,
    image: '🛵',
    description: 'Built for the open road. Chrome and comfort.'
  },
  {
    id: 'bike-3',
    name: 'Superbike',
    type: 'bike',
    basePrice: 12000,
    image: '🏍️',
    description: 'Cutting edge technology. Only for the serious tuners.'
  },
  {
    id: 'bike-4',
    name: 'Cafe Racer',
    type: 'bike',
    basePrice: 3500,
    image: '🏍️',
    description: 'Minimalist style, maximum cool. A true custom canvas.'
  }
];

export const PARTS: Part[] = [
  { id: 'eng-1', name: 'Basic Tune-up', category: 'engine', price: 500, performanceBoost: 10, appealBoost: 5 },
  { id: 'eng-2', name: 'Turbocharger', category: 'engine', price: 2500, performanceBoost: 40, appealBoost: 15 },
  { id: 'eng-3', name: 'Racing ECU', category: 'engine', price: 4000, performanceBoost: 60, appealBoost: 10 },
  { id: 'tire-1', name: 'Sport Tires', category: 'tires', price: 800, performanceBoost: 15, appealBoost: 10 },
  { id: 'tire-2', name: 'Off-road Tires', category: 'tires', price: 1200, performanceBoost: 20, appealBoost: 5 },
  { id: 'exh-1', name: 'Chrome Exhaust', category: 'exhaust', price: 1200, performanceBoost: 5, appealBoost: 25 },
  { id: 'exh-2', name: 'Titanium Pipe', category: 'exhaust', price: 3000, performanceBoost: 15, appealBoost: 30 },
  { id: 'susp-1', name: 'Lowering Kit', category: 'suspension', price: 1500, performanceBoost: 10, appealBoost: 20 },
  { id: 'susp-2', name: 'Air Suspension', category: 'suspension', price: 5000, performanceBoost: 5, appealBoost: 50 },
  { id: 'body-1', name: 'Carbon Fiber Hood', category: 'body', price: 3000, performanceBoost: 5, appealBoost: 40 },
  { id: 'body-2', name: 'Wide Body Kit', category: 'body', price: 7500, performanceBoost: 0, appealBoost: 80 },
];

export const COLORS = [
  { name: 'Midnight Black', value: '#1a1a1a' },
  { name: 'Racing Red', value: '#cc0000' },
  { name: 'Electric Blue', value: '#0066cc' },
  { name: 'Forest Green', value: '#2d5a27' },
  { name: 'Solar Yellow', value: '#f1c40f' },
  { name: 'Silver Bullet', value: '#bdc3c7' },
];

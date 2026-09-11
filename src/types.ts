export interface Garment {
  id: string;
  name: string;
  category: 'top' | 'bottom' | 'outerwear' | 'dress' | 'accessory';
  imageUrl: string;
  brand?: string;
  price?: number;
  description?: string;
  metadata?: any;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  savedTryOns: string[];
  createdAt: string;
  role?: 'admin' | 'user';
}

export interface TryOnJob {
  id: string;
  userId: string;
  userImageUrl: string;
  garmentIds: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  resultImageUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export type LayerCategory = 'top' | 'bottom' | 'outerwear' | 'dress' | 'shoes' | 'cap' | 'accessory';

export interface Graphic {
  id: string;
  image: string; // base64
  placement: 'manual' | 'left_chest' | 'center' | 'sleeve' | 'back';
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface Pattern {
  image: string; // base64
  scale: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
  repeat: 'tile' | 'mirror';
}

export interface Material {
  colorHex?: string;
  fabricImage?: string; // base64
  textureScale?: number;
  rotation?: number;
}

export interface Layer {
  id: string;
  name: string;
  type: 'garment' | 'accessory' | 'footwear' | 'headwear';
  category: LayerCategory;
  visible: boolean;
  zIndex: number;
  material: Material;
  graphics: Graphic[];
  pattern?: Pattern;
  prompt: string;
  promptStrength: number;
}

export interface Variant {
  id: string;
  name: string;
  layers: Layer[];
  outputImage?: string;
}

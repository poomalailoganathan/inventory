export interface Rod {
  id: string;
  diameter: number;
  weight: number;
  totalLength?: number;
  createdAt: Date;
}

export interface Process {
  id: string;
  name: string;
  processId: string;
  diameter: number;
  weightUsed: number;
  bladeDiameter: number;
  totalLength?: number;
  numberOfRods: number;
  lengthPerRod: number;
  lengthUnit: 'mm' | 'cm' | 'm';
  weightPerRod: number;
  wastagePerRod: number;
  wastageUnit: 'g' | 'kg';
  createdAt: Date;
  status: 'in-progress' | 'completed';
}

export interface FinishedGood {
  id: string;
  processId: string;
  number: number;
  height: number;
  weight: number;
  weightPerItem: number;
  createdAt: Date;
}

export interface NonConformingItem {
  id: string;
  processId: string;
  number: number;
  height: number;
  weight: number;
  weightPerItem: number;
  includeInReport: boolean;
  createdAt: Date;
}

export interface RejectedItem {
  id: string;
  processId: string;
  number: number;
  weight: number;
  weightPerItem: number;
  reason: string;
  includeInReport: boolean;
  createdAt: Date;
}

export interface WeightLossItem {
  id: string;
  processId: string;
  weight: number;
  weightLossPerRod: number;
  createdAt: Date;
}

export interface ProcessSummary {
  id: string;
  processId: string;
  totalWeightUsed: number;
  totalWeightLoss: number;
  remainingWeight: number;
  weightLossPerRod: number;
  addRemainingToStock: boolean;
  createdAt: Date;
}

export interface LeftoverMaterial {
  id: string;
  processId: string;
  diameter: number;
  weight: number;
  createdAt: Date;
}

export interface InventoryStats {
  totalRods: number;
  totalWeight: number;
  diameterBreakdown: Record<number, { weight: number }>;
}

export interface InventoryTransaction {
  id: string;
  date: Date;
  diameter: number;
  weight: number;
  length?: number;
  type: 'in' | 'out';
  processId?: string;
  processName?: string;
}

export interface ProcessGroup {
  id: string;
  name: string;
  processIds: string[];
  createdAt: Date;
}
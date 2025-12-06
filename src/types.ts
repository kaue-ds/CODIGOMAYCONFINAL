
export type UserRole = 'super_admin' | 'admin' | 'employee';

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  maxEmployees?: number;
  createdBy?: string;
}

export interface SavedInspection {
  id: string;
  date: string;
  plate: string;
  vehicle: string;
  clientName: string;
  clientEmail: string;
  inspector: string;
  mileage: string;
  fuelLevel: number;
  removedItems?: string;
  observation?: string;
  savedBy: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  username: string;
  action: string;
  details: string;
}

export interface InspectionData {
    id?: string;
    contractNumber: string;
    plate: string;
    inspector: string;
    clientName: string;
    clientEmail: string;
    vehicle: string;
    mileage: string;
    removedItems: string;
    observation: string;
    collectionObservation: string;
    checklist: Record<string, any>;
    fuelLevel: number;
    tires: {
        fl: string;
        fr: string;
        rl: string;
        rr: string;
        spare: string;
    };
    photos: Record<string, any>;
    inspectorSignature: string;
    clientSignature: string;
}

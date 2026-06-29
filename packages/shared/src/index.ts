export type GuestLookupStatus = "ok" | "not_found";

export interface GuestLookupResponse {
  status: GuestLookupStatus;
  name?: string;
  seats?: number;
}

export interface RsvpUpsertRequest {
  name: string;
  weddingAttend: boolean;
  afterAttend: boolean;
  headcount: number;
  addrRoad: string;
  addrZip?: string;
  addrDetail?: string;
}

export interface RsvpUpsertResponse {
  guestId: number;
  name: string;
  seats: number;
  weddingAttend: boolean;
  afterAttend: boolean;
  headcount: number;
  addrRoad: string;
  addrZip: string | null;
  addrDetail: string | null;
  totalAttendees: number;
  updatedAt: string;
}

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

export interface LayoutVersionMeta {
  name: string;
  s3Prefix: string;
  venueId: string | null;
  label: string | null;
  createdAt: string;
  updatedAt: string;
  latestHistory?: LayoutVersionHistoryMeta | null;
}

export interface LayoutVersionHistoryMeta {
  id: number;
  s3Key: string;
  savedAt: string;
  label: string | null;
}

export interface LayoutVersionListResponse {
  items: LayoutVersionMeta[];
}

export interface LayoutVersionHistoryListResponse {
  version: LayoutVersionMeta;
  items: LayoutVersionHistoryMeta[];
}

export interface LayoutVersionGetResponse {
  meta: LayoutVersionMeta;
  history: LayoutVersionHistoryMeta;
  layout: Record<string, unknown>;
}

export interface CreateLayoutVersionRequest {
  name: string;
  layout: Record<string, unknown>;
  label?: string;
}

export interface UpdateLayoutVersionRequest {
  layout: Record<string, unknown>;
  label?: string;
}

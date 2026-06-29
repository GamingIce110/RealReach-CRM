import type { Attendance, CRMState, Profile } from "../types";
import { makeId, nowIso } from "./helpers";

export function checkIn(
  state: CRMState,
  user: Profile,
  coords: { latitude: number; longitude: number },
  notes: string
): Attendance {
  return {
    id: makeId("att"),
    organizationId: state.organization.id,
    userId: user.id,
    checkInTime: nowIso(),
    checkOutTime: null,
    checkInLatitude: coords.latitude,
    checkInLongitude: coords.longitude,
    checkOutLatitude: null,
    checkOutLongitude: null,
    status: new Date().getHours() > 10 ? "Late" : "Present",
    notes,
    selfieUrl: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

export function checkOut(entry: Attendance, coords: { latitude: number; longitude: number }): Attendance {
  return {
    ...entry,
    checkOutTime: nowIso(),
    checkOutLatitude: coords.latitude,
    checkOutLongitude: coords.longitude,
    updatedAt: nowIso(),
  };
}

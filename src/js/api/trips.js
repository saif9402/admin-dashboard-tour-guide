import { http } from "./http.js";

export async function getAllTrips(params) {
  const qs = new URLSearchParams(params).toString();
  return http(`/api/Trip/GetAllTrips?${qs}`, { method: "GET" });
}

export const getTripAdmin = (id) => http(`/api/Trip/GetTripByIdForAdmin/${id}`);
export const getTripPublic = (id) => http(`/api/Trip/GetTripById/${id}`);

export const addTrip = (payload) =>
  http("/api/Trip/AddTrip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

export const updateTrip = (id, payload) =>
  http(`/api/Trip/UpdateTrip/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

export const deleteTrip = (id) =>
  http(`/api/Trip/DeleteTrip/${id}`, { method: "DELETE" });

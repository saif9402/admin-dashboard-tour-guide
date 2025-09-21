import { http } from "./http.js";

export function getReviews(tripId, sort) {
  const p = new URLSearchParams({ TripId: String(tripId) });
  if (sort) p.append("Sort", sort);
  return http(`/api/Reviews/GetReviews?${p.toString()}`);
}

export function deleteReview(tripId, userId) {
  return http(`/api/Reviews/DeleteReview/${tripId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: Number(userId) }),
  });
}

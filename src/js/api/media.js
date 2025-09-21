import { http } from "./http.js";

export function addImagesToTrip(tripId, formData) {
  return http(`/api/Trip/AddImagesToTrip/${tripId}`, {
    method: "POST",
    body: formData,
  });
}
export function deleteImagesFromTrip(tripId, formData) {
  return http(`/api/Trip/DeleteImagesFromTrip/${tripId}`, {
    method: "DELETE",
    body: formData,
  });
}

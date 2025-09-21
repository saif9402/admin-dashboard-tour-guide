import { http } from "./http.js";

const unwrap = (r) =>
  Array.isArray(r.json?.data)
    ? r.json.data
    : Array.isArray(r.json?.data?.data)
    ? r.json.data.data
    : [];

export async function getLanguages() {
  const r = await http("/api/Language/GetAllLanguages");
  return unwrap(r);
}
export async function getActivities() {
  const r = await http("/api/Activity/GetAllActivities");
  return unwrap(r);
}
export async function getCategories() {
  const r = await http("/api/Category/GetAllCategories");
  return unwrap(r);
}
export async function getIncludes() {
  const r = await http("/api/Includes/GetAllIncludes");
  return unwrap(r);
}

// Global-ish state shared across features
export const state = {
  baseUrl: "/api/Trip/GetAllTrips",
  pageSize: 8,
  currentPage: 1,
  availableLanguages: [],
  allIncludes: [],
  currentTripId: null,
  mainImageName: null,
  modalMode: "add", // 'add' | 'edit'
  editTripId: null,
  lastFocusedEl: null,
  sortState: { key: null, dir: "asc" }, // name|category
  lastTripsPage: [],
  selectedImageIds: new Set(),
  currentMainImageId: null,
  reviewsSortValue: "date:desc",
  lastReviews: [],
  filters: { search: "", languageId: "", sort: "" },
  currentIsAvailable: "", // "", "true", "false"
  currentIsTopRated: "",
  currentIsBestSeller: "",
};

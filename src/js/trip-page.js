// trip-page.js

const baseUrl = "/api/Trip/GetAllTrips";
const tripTable = document.getElementById("tripTable");
let currentPage = 1;
const pageSize = 8;
let availableLanguages = [];

// Fetch Trips
async function fetchTrips(page = 1) {
  const response = await fetch(`${baseUrl}?pageNumber=${page}&pageSize=${pageSize}`);
  const result = await response.json();

  if (result.succeeded) {
    renderTrips(result.data.data);
    renderPagination(result.data.pageNumber, result.data.count);
  } else {
    tripTable.innerHTML = '<tr><td colspan="7" class="text-center text-red-500 py-4">Failed to load trips</td></tr>';
  }
}

// Render Trips
function renderTrips(trips) {
  tripTable.innerHTML = "";

  if (trips.length === 0) {
    tripTable.innerHTML = '<tr><td colspan="7" class="text-center py-4">No trips found</td></tr>';
    return;
  }

  trips.forEach((trip) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="px-6 py-3">${trip.name}</td>
      <td class="px-6 py-3">${trip.category}</td>
      <td class="px-6 py-3">$${trip.price.toFixed(2)}</td>
      <td class="px-6 py-3">${trip.duration}</td>
      <td class="px-6 py-3">${trip.isAvailable ? "Yes" : "No"}</td>
      <td class="px-6 py-3 flex items-center gap-2">
        <button class="text-blue-400 hover:text-blue-900 shadow-inner" title="Edit">
          <i data-lucide="pencil"></i>
        </button>
        <button class="text-red-400 hover:text-red-900" title="Delete">
          <i data-lucide="trash-2"></i>
        </button>
      </td>
    `;
    tripTable.appendChild(row);
  });

  lucide.createIcons();
}

// Pagination
function renderPagination(current, totalCount) {
  const paginationContainer = document.getElementById("pagination");
  const totalPages = Math.ceil(totalCount / pageSize);
  paginationContainer.innerHTML = "";

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "Previous";
  prevBtn.disabled = current === 1;
  prevBtn.className = "px-4 py-2 bg-gray-200 rounded disabled:opacity-50";
  prevBtn.onclick = () => {
    if (current > 1) {
      currentPage--;
      fetchTrips(currentPage);
    }
  };

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next";
  nextBtn.disabled = current === totalPages;
  nextBtn.className = "px-4 py-2 bg-gray-200 rounded disabled:opacity-50";
  nextBtn.onclick = () => {
    if (current < totalPages) {
      currentPage++;
      fetchTrips(currentPage);
    }
  };

  paginationContainer.appendChild(prevBtn);
  paginationContainer.append(` Page ${current} of ${totalPages} `);
  paginationContainer.appendChild(nextBtn);
}

// Add Translation Row
function createTranslationRow(type) {
  const wrapper = document.createElement("div");
  wrapper.className = "flex items-center gap-2 mt-2";

  const select = document.createElement("select");
  select.name = `${type}LangId`;
  select.className = "border rounded px-2 py-1";
  availableLanguages.forEach((lang) => {
    const opt = document.createElement("option");
    opt.value = lang.id;
    opt.textContent = lang.name;
    select.appendChild(opt);
  });

  const input = document.createElement(type === "name" ? "input" : "textarea");
  input.name = `${type}Value`;
  input.className = "border rounded px-2 py-1 flex-1";

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.textContent = "✕";
  removeBtn.className = "text-red-500 font-bold";
  removeBtn.onclick = () => wrapper.remove();

  wrapper.appendChild(select);
  wrapper.appendChild(input);
  wrapper.appendChild(removeBtn);
  return wrapper;
}

// Fetch Languages
async function fetchLanguages() {
  const res = await fetch("/api/Language/GetAllLanguages");
  const result = await res.json();
  availableLanguages = result.data || [];
}

// Extract Translations
function extractTranslations(containerId, type) {
  const container = document.getElementById(containerId);
  const translations = [];
  const children = Array.from(container.children);

  for (let child of children) {
    const langId = parseInt(child.querySelector(`select[name=${type}LangId]`).value);
    const text = child.querySelector(`[name=${type}Value]`).value.trim();
    if (langId && text) {
      translations.push({ languageId: langId, translation: text });
    }
  }
  return translations;
}

// Form Submit
async function handleTripSubmit(e) {
  e.preventDefault();
  const form = e.target;

  const nameTranslations = extractTranslations("nameTranslations", "name");
  const descriptionTranslations = extractTranslations("descriptionTranslations", "description");

  const tripDto = {
    Name: nameTranslations,
    Description: descriptionTranslations,
    Price: parseFloat(form.Price.value),
    Duration: parseInt(form.Duration.value),
    TripDates: [new Date(form["TripDates[]"].value).toISOString()],
    IsAvailable: form.IsAvailable.checked,
    CategoryId: parseInt(form.CategoryId.value),
    Activities: Array.from(form.Activities.selectedOptions).map((opt) => parseInt(opt.value)),
    Languages: Array.from(form.Languages.selectedOptions).map((opt) => parseInt(opt.value)),
    Includes: Array.from(form.Includes.selectedOptions).map((opt) => parseInt(opt.value)),
    NotIncludes: Array.from(form.NotIncludes.selectedOptions).map((opt) => parseInt(opt.value)),
  };

  try {
    const response = await fetch("/api/Trip/AddTrip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tripDto),
    });

    const result = await response.json();
    if (response.ok && result.succeeded) {
      alert("Trip added successfully");
      form.reset();
      document.getElementById("tripModal").classList.add("hidden");
      fetchTrips();
    } else {
      alert("Failed to add trip: " + result.message);
    }
  } catch (error) {
    console.error("Error submitting trip:", error);
    alert("Something went wrong.");
  }
}

// Event Binding
function setupEventListeners() {
  document.getElementById("addTripBtn").addEventListener("click", () => {
    document.getElementById("tripModal").classList.remove("hidden");
  });

  document.getElementById("cancelBtn").addEventListener("click", () => {
    document.getElementById("tripModal").classList.add("hidden");
    document.getElementById("tripForm").reset();
  });

  document.getElementById("cancelBtn2").addEventListener("click", () => {
    document.getElementById("tripModal").classList.add("hidden");
    document.getElementById("tripForm").reset();
  });

  document.getElementById("tripForm").addEventListener("submit", handleTripSubmit);
  document.getElementById("addNameTranslation").addEventListener("click", () => {
    document.getElementById("nameTranslations").appendChild(createTranslationRow("name"));
  });

  document.getElementById("addDescriptionTranslation").addEventListener("click", () => {
    document.getElementById("descriptionTranslations").appendChild(createTranslationRow("description"));
  });
}

// Initialization
(async function init() {
  await fetchLanguages();
  setupEventListeners();
  fetchTrips();
})();

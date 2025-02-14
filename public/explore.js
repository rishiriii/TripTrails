import { auth } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';

let currentFilters = {
  stops: '',
  maxExpense: 10000,
  minDays: 1,
  maxDays: 30,
  sortBy: 'recent'
};

let allTrips = []; // Store all fetched trips

document.addEventListener('DOMContentLoaded', () => {
  const searchBtn = document.getElementById('search-btn');
  const startLocation = document.getElementById('start-location');
  const endLocation = document.getElementById('end-location');
  const filterBtn = document.getElementById('filter-btn');
  const modal = document.getElementById('filter-modal');
  const closeBtn = document.querySelector('.close');
  const applyFiltersBtn = document.getElementById('apply-filters');
  const resetFiltersBtn = document.getElementById('reset-filters');
  const expenseSlider = document.getElementById('expense-slider');
  const expenseValue = document.getElementById('expense-value');
  
  // Add new expense input field
  const expenseInput = document.createElement('input');
  expenseInput.type = 'number';
  expenseInput.min = '0';
  expenseInput.max = '100000';
  expenseInput.className = 'expense-input';
  expenseInput.value = expenseSlider.value;
  // Insert input field after the expense value display
  expenseValue.parentNode.insertBefore(expenseInput, expenseValue.nextSibling);

  // Update both display and input when slider changes
  expenseSlider.oninput = function() {
    const value = parseInt(this.value);
    updateExpenseDisplay(value);
    expenseInput.value = value;
  }

  // Update slider and display when input changes
  expenseInput.oninput = function() {
    let value = parseInt(this.value);
    
    // Ensure value is within bounds
    if (value < 0) value = 0;
    if (value > 100000) value = 100000;
    
    expenseSlider.value = value;
    updateExpenseDisplay(value);
  }

  // Function to update the expense display
  function updateExpenseDisplay(value) {
    expenseValue.textContent = `$${parseInt(value).toLocaleString()}`;
  }

  // Modal controls remain the same
  filterBtn.onclick = () => modal.style.display = "block";
  closeBtn.onclick = () => modal.style.display = "none";
  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  }

  // Update reset filters to include the input field
  resetFiltersBtn.onclick = () => {
    document.getElementById('stops-filter').value = '';
    document.getElementById('expense-slider').value = 10000;
    expenseInput.value = 10000;
    document.getElementById('min-days').value = 1;
    document.getElementById('max-days').value = 30;
    document.getElementById('sort-by').value = 'recent';
    expenseValue.textContent = '$10,000';
    currentFilters = {
      stops: '',
      maxExpense: 10000,
      minDays: 1,
      maxDays: 30,
      sortBy: 'recent'
    };
    filterAndDisplayTrips();
  }

  // Apply filters remains the same
  applyFiltersBtn.onclick = () => {
    currentFilters = {
      stops: document.getElementById('stops-filter').value,
      maxExpense: parseInt(document.getElementById('expense-slider').value),
      minDays: parseInt(document.getElementById('min-days').value),
      maxDays: parseInt(document.getElementById('max-days').value),
      sortBy: document.getElementById('sort-by').value
    };
    modal.style.display = "none";
    filterAndDisplayTrips();
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      searchTrips(startLocation.value, endLocation.value);
    });
  }

  // Load all trips initially
  onAuthStateChanged(auth, (user) => {
    if (user) {
      searchTrips();
    }
  });
});

function filterAndDisplayTrips() {
  let filteredTrips = [...allTrips];

  // Apply location filters
  const startLocation = document.getElementById('start-location').value.toLowerCase();
  const endLocation = document.getElementById('end-location').value.toLowerCase();
  
  if (startLocation) {
    filteredTrips = filteredTrips.filter(trip => 
      (trip.originalStart || trip.start || '').toLowerCase().includes(startLocation)
    );
  }
  
  if (endLocation) {
    filteredTrips = filteredTrips.filter(trip => 
      (trip.originalEnd || trip.end || '').toLowerCase().includes(endLocation)
    );
  }

  // Apply stops filter
  if (currentFilters.stops) {
    const [min, max] = currentFilters.stops.split('-').map(n => n.replace('+', ''));
    filteredTrips = filteredTrips.filter(trip => {
      const numStops = trip.stops ? trip.stops.length : 0;
      if (max === undefined) {
        return numStops >= parseInt(min);
      }
      return numStops >= parseInt(min) && numStops <= parseInt(max);
    });
  }

  // Apply expense filter
  filteredTrips = filteredTrips.filter(trip => 
    (trip.expense || 0) <= currentFilters.maxExpense
  );

  // Apply duration filter
  filteredTrips = filteredTrips.filter(trip => 
    trip.days >= currentFilters.minDays && 
    trip.days <= currentFilters.maxDays
  );

  // Sort trips
  switch (currentFilters.sortBy) {
    case 'views':
      filteredTrips.sort((a, b) => ((b.views || 0) - (a.views || 0)));
      break;
    case 'likes':
      filteredTrips.sort((a, b) => ((b.likes || 0) - (a.likes || 0)));
      break;
    case 'recent':
    default:
      filteredTrips.sort((a, b) => {
        const bTime = b.createdAt || 0;
        const aTime = a.createdAt || 0;
        return bTime - aTime;
      });
      break;
  }

  displayTrips(filteredTrips);
}

function displayTrips(trips) {
  const tripList = document.getElementById('trip-list');
  if (!tripList) return;

  tripList.innerHTML = '';

  if (!trips || trips.length === 0) {
    tripList.innerHTML = '<p>No trips found matching your search criteria.</p>';
    return;
  }

  trips.forEach(trip => {
    const tripCard = document.createElement('div');
    tripCard.className = 'trip-card';

    const displayStart = trip.originalStart || trip.start;
    const displayEnd = trip.originalEnd || trip.end;
    const displayTitle = `${displayStart} to ${displayEnd}`;

    tripCard.innerHTML = `
      <div class="card-image">
        <img 
          src="${trip.bannerPhoto || 'placeholder.jpg'}" 
          alt="Banner Photo"
          style="width: 100%; height: 150px; object-fit: cover; border-radius: 10px;">
      </div>
      <div class="card-content">
        <h3>${displayTitle}</h3>
        <p>${trip.days} Days / ${trip.nights} Nights</p>
        <p>Cost: $${trip.expense?.toLocaleString() || 0}</p>
        <p>Stops: ${trip.stops ? trip.stops.length : 0}</p>
        <div class="trip-stats">
          <span>👁️ ${trip.views || 0}</span>
          <span>❤️ ${trip.likes || 0}</span>
        </div>
      </div>
    `;

    tripCard.addEventListener('click', () => {
      window.location.href = `trip-details.html?id=${trip.id}`;
    });

    tripList.appendChild(tripCard);
  });
}


async function searchTrips(start = '', end = '') {
  const tripList = document.getElementById('trip-list');
  if (!tripList) {
    console.warn('Trip list element not found');
    return;
  }

  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const token = await user.getIdToken(true);
    const queryParams = new URLSearchParams();
    if (start) queryParams.append('start', start.toLowerCase());
    if (end) queryParams.append('end', end.toLowerCase());
    
    // Add timestamp to prevent caching
    queryParams.append('_t', Date.now());
    
    const response = await fetch(`/trips/search?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        // Add cache control headers
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch trips');
    }

    allTrips = await response.json();
    
    // Ensure all trips have a createdAt timestamp
    allTrips = allTrips.map(trip => ({
      ...trip,
      createdAt: trip.createdAt || Date.now() // Default to current time if missing
    }));
    
    filterAndDisplayTrips();

  } catch (error) {
    console.error('Error searching trips:', error.message);
    if (tripList) {
      tripList.innerHTML = `
        <p>Failed to load trips. Please try again later.</p>
        <button onclick="window.location.reload()" class="retry-button">Retry</button>
      `;
    }
  }
}

// Add event listeners for input fields to enable search-as-you-type
document.addEventListener('DOMContentLoaded', () => {
  const startLocation = document.getElementById('start-location');
  const endLocation = document.getElementById('end-location');
  let debounceTimer;

  const debounceSearch = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchTrips(startLocation.value, endLocation.value);
    }, 500);
  };

  startLocation.addEventListener('input', debounceSearch);
  endLocation.addEventListener('input', debounceSearch);
});

// Add this to your explore.js file
document.addEventListener('DOMContentLoaded', () => {
  const expenseSlider = document.getElementById('expense-slider');
  const expenseValue = document.getElementById('expense-value');
  const expenseInput = document.querySelector('.expense-input');

  // Create and insert progress bar element
  const rangeProgress = document.createElement('div');
  rangeProgress.className = 'range-progress';
  expenseSlider.parentElement.appendChild(rangeProgress);

  function updateSliderProgress(value) {
    const min = parseInt(expenseSlider.min) || 0;
    const max = parseInt(expenseSlider.max) || 10000;
    const percentage = ((value - min) / (max - min)) * 100;
    
    // Update progress bar width and position
    rangeProgress.style.width = `${percentage}%`;
    rangeProgress.style.left = '0';
  }

  if (expenseSlider) {
    // Initial update
    updateSliderProgress(expenseSlider.value);

    // Update on slider input
    expenseSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      updateSliderProgress(value);
      expenseValue.textContent = `$${value.toLocaleString()}`;
      expenseInput.value = value;
    });

    // Update on text input
    expenseInput.addEventListener('input', (e) => {
      let value = parseInt(e.target.value);
      if (isNaN(value)) value = 0;
      if (value > parseInt(expenseSlider.max)) value = parseInt(expenseSlider.max);
      if (value < parseInt(expenseSlider.min)) value = parseInt(expenseSlider.min);
      
      expenseSlider.value = value;
      updateSliderProgress(value);
      expenseValue.textContent = `$${value.toLocaleString()}`;
    });
  }
});

export { searchTrips };
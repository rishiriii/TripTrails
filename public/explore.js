import { auth } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';

document.addEventListener('DOMContentLoaded', () => {
  const searchBtn = document.getElementById('search-btn');
  const startLocation = document.getElementById('start-location');
  const endLocation = document.getElementById('end-location');

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
    
    const response = await fetch(`/trips/search?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch trips');
    }

    const trips = await response.json();
    tripList.innerHTML = '';

    if (!trips || trips.length === 0) {
      tripList.innerHTML = '<p>No trips found matching your search criteria.</p>';
      return;
    }

    trips.forEach((trip) => {
      const tripCard = document.createElement('div');
      tripCard.className = 'trip-card';

      // Use original location names for display if available, fallback to stored versions
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
          <p>Cost: $${trip.expense || 0}</p>
          <p>Stops: ${trip.stops ? trip.stops.length : 0}</p>
        </div>
      `;

      tripCard.addEventListener('click', () => {
        window.location.href = `trip-details.html?id=${trip.id}`;
      });

      tripList.appendChild(tripCard);
    });

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
    }, 500); // Wait 500ms after user stops typing before searching
  };

  startLocation.addEventListener('input', debounceSearch);
  endLocation.addEventListener('input', debounceSearch);
});

export { searchTrips };
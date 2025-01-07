import { auth } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';

// Check if we're on a page that uses the trip list
function hasTripList() {
  return document.getElementById('trip-list') !== null;
}

document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'login.html';
    } else {
      // Only load trips if we're on a page with the trip list
      if (hasTripList()) {
        loadTrips();
      }
    }
  });
});

async function loadTrips() {
  const tripList = document.getElementById('trip-list');
  if (!tripList) {
    console.warn('Trip list element not found on this page');
    return;
  }

  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const token = await user.getIdToken(true);
    const response = await fetch('/trips', {
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
      tripList.innerHTML = '<p>No trips found. Start by creating your first trip!</p>';
      return;
    }

    trips.forEach((trip) => {
      const tripCard = document.createElement('div');
      tripCard.className = 'trip-card';

      tripCard.innerHTML = `
        <div class="card-image">
          <img 
            src="${trip.bannerPhoto || 'placeholder.jpg'}" 
            alt="Banner Photo"
            style="width: 100%; height: 150px; object-fit: cover; border-radius: 10px;">
        </div>
        <div class="card-content">
          <h3>${trip.title || 'Untitled Trip'}</h3>
          
          <p>${trip.days} Days / ${trip.nights} Nights</p>
          <p>Cost: $${trip.expense || 0}</p>
          <p>Stops: ${trip.stops ? trip.stops.length : 0}</p>
          ${
            trip.userId === user.uid
              ? `<button class="delete-trip-btn" data-id="${trip.id}" data-banner="${trip.bannerPhoto}">Delete</button>`
              : ''
          }
        </div>
      `;

      tripCard.addEventListener('click', (e) => {
        if (!e.target.matches('.delete-trip-btn')) {
          window.location.href = `trip-details.html?id=${trip.id}`;
        }
      });

      tripList.appendChild(tripCard);
    });

    addDeleteFunctionality();
  } catch (error) {
    console.error('Error loading trips:', error.message);
    if (tripList) {
      tripList.innerHTML = `
        <p>Failed to load trips. Please try again later.</p>
        <button onclick="window.location.reload()" class="retry-button">Retry</button>
      `;
    }
  }
}

function addDeleteFunctionality() {
  document.querySelectorAll('.delete-trip-btn').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      event.preventDefault();

      const tripId = button.dataset.id;
      const bannerPhoto = button.dataset.banner;

      if (!confirm('Are you sure you want to delete this trip?')) return;

      try {
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');

        const token = await user.getIdToken(true);
        const response = await fetch(`/trips/${tripId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ bannerPhoto }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete trip');
        }

        alert('Trip deleted successfully');
        loadTrips();
      } catch (error) {
        console.error('Error:', error.message);
        alert('Error deleting trip');
      }
    });
  });
}

export { loadTrips };
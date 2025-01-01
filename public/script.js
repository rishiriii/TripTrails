import { auth } from '../firebase.js'; // Import Firebase Auth
import { onAuthStateChanged } from 'firebase/auth';


document.addEventListener('DOMContentLoaded', () => {
  // Monitor auth state and load trips
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'login.html';
    } else {
      createProfileDropdown();
      loadTrips();
    }
  });
});

async function loadTrips() {
  try {
    const user = auth.currentUser;

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get the Firebase ID token
    const token = await user.getIdToken(true); // Ensure the token is fresh

    // Fetch trips from the backend with the token in the Authorization header
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
    const tripList = document.getElementById('trip-list');
    tripList.innerHTML = ''; // Clear existing content

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
          <p>${trip.days || 0} Days / ${trip.nights || 0} Nights</p>
          <p>Cost: $${trip.expense || 0}</p>
          <p>Stops: ${trip.stops ? trip.stops.length : 0}</p>
          ${
            trip.userId === user.uid
              ? `<button class="delete-trip-btn" data-id="${trip.id}" data-banner="${trip.bannerPhoto}">Delete</button>`
              : ''
          }
        </div>
      `;

      // Add event listener to open trip details
      tripCard.addEventListener('click', () => {
        window.location.href = `trip-details.html?id=${trip.id}`;
      });

      tripList.appendChild(tripCard);
    });

    // Add delete button functionality
    addDeleteFunctionality();
  } catch (error) {
    console.error('Error loading trips:', error.message);
    const tripList = document.getElementById('trip-list');
    tripList.innerHTML = `<p>Failed to load trips. Please try again later.</p>`;
  }
}

// Add event listeners to delete buttons
function addDeleteFunctionality() {
  document.querySelectorAll('.delete-trip-btn').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation(); // Prevent card click event
      event.preventDefault(); // Prevent default button action

      const tripId = button.dataset.id;
      const bannerPhoto = button.dataset.banner;

      const confirmDelete = confirm('Are you sure you want to delete this trip?');
      if (!confirmDelete) return;

      try {
        const user = auth.currentUser;

        if (!user) {
          throw new Error('User not authenticated');
        }

        // Get the Firebase ID token
        const token = await user.getIdToken(true);

        // Send delete request with the token
        const response = await fetch(`/trips/${tripId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ bannerPhoto }), // Send banner photo URL to backend
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete trip');
        }

        alert('Trip deleted successfully');
        loadTrips(); // Refresh the list
      } catch (error) {
        alert('Error deleting trip');
        console.error('Error:', error.message);
      }
    });
  });
}

// Monitor auth state and load trips
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    loadTrips();
  }
});

// Import Firebase auth
import { auth } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';

// Extract the trip ID from the URL
const urlParams = new URLSearchParams(window.location.search);
const tripId = urlParams.get('id');

// Fetch trip details based on the trip ID
async function loadTripDetails() {
  if (!tripId) {
    document.getElementById('trip-title').textContent = 'No trip ID provided';
    return;
  }

  try {
    // Ensure the user is authenticated
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get the Firebase ID token
    const token = await user.getIdToken();

    // Fetch trip details with authorization
    const response = await fetch(`/trips/${tripId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch trip details');
    }

    const trip = await response.json();

    // Populate the page with the banner photo
    const bannerContainer = document.getElementById('trip-banner');
    if (trip.bannerPhoto) {
      bannerContainer.innerHTML = `
        <img 
          src="${trip.bannerPhoto}" 
          alt="Banner Photo" 
          style="width: 100%; height: 300px; object-fit: cover; border-radius: 10px;">
      `;
    } else {
      bannerContainer.innerHTML = `<p>No banner photo available</p>`;
    }

    // Populate the page with trip details
    document.getElementById('trip-title').textContent = trip.title || 'No Title';
    document.getElementById('trip-start-end').textContent = `${trip.start || 'Unknown'} to ${trip.end || 'Unknown'}`;
    document.getElementById('trip-days').textContent = `${trip.days || 0} Days / ${trip.nights || 0} Nights`;
    document.getElementById('trip-expense').textContent = `Cost: $${trip.expense || 0}`;
    document.getElementById('trip-description').textContent = trip.description || 'No description available';

    // Handle stops and route display
    const stopsList = document.getElementById('trip-stops');
    const stopsContainer = document.getElementById('stops-container');
    if (trip.stops && trip.stops.length > 0) {
      // Add stops to the list
      stopsList.innerHTML = trip.stops.map((stop) => `<li>${stop}</li>`).join('');
    } else {
      stopsList.innerHTML = '<li>No stops available</li>';
    }

    // Handle photos
    const photosContainer = document.getElementById('trip-photos');
    if (trip.photos && trip.photos.length > 0) {
      photosContainer.innerHTML = trip.photos
        .map(
          (photo) =>
            `<img src="${photo}" alt="Trip Photo" style="width: 100%; height: auto; border-radius: 10px;">`
        )
        .join('');
    } else {
      photosContainer.textContent = 'No photos available';
    }

    // Display the username of the trip poster at the bottom
    const usernameContainer = document.getElementById('trip-username');
    usernameContainer.textContent = `Posted by: ${trip.userEmail || 'Unknown user'}`;
  } catch (error) {
    console.error('Error fetching trip details:', error.message);
    document.getElementById('trip-title').textContent = 'Trip not found';
    document.getElementById('trip-description').textContent = 'Unable to load trip details. Please try again later.';
  }
}

// Monitor auth state and load trip details
onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert('You must be logged in to access this page!');
    window.location.href = 'login.html'; // Redirect to login if not authenticated
  } else {
    loadTripDetails(); // Load trip details if the user is authenticated
  }
});



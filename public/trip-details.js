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
    const response = await fetch(`/trips/${tripId}`);
    if (!response.ok) throw new Error('Trip not found');

    const trip = await response.json();

    // Populate the page with trip details
    document.getElementById('trip-title').textContent = trip.title || 'No Title';
    document.getElementById('trip-start-end').textContent = `${trip.start || 'Unknown'} to ${trip.end || 'Unknown'}`;
    document.getElementById('trip-days').textContent = `${trip.days || 0} Days / ${trip.nights || 0} Nights`;
    document.getElementById('trip-expense').textContent = `Cost: $${trip.expense || 0}`;
    document.getElementById('trip-description').textContent = trip.description || 'No description available';

    // Handle stops
    const stopsList = document.getElementById('trip-stops');
    if (trip.stops && trip.stops.length > 0) {
      stopsList.innerHTML = trip.stops.map(stop => `<li>${stop}</li>`).join('');
    } else {
      stopsList.innerHTML = '<li>No stops available</li>';
    }

    // Handle photos
    const photosContainer = document.getElementById('trip-photos');
    if (trip.photos && trip.photos.length > 0) {
      photosContainer.innerHTML = trip.photos.map(photo => `<img src="${photo}" alt="Trip Photo">`).join('');
    } else {
      photosContainer.textContent = 'No photos available';
    }
  } catch (error) {
    console.error('Error fetching trip details:', error.message);
    document.getElementById('trip-title').textContent = 'Trip not found';
    document.getElementById('trip-description').textContent = 'Unable to load trip details. Please try again later.';
  }
}

// Load trip details on page load
loadTripDetails();

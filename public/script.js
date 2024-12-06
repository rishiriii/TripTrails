// public/script.js
async function loadTrips() {
  try {
    const response = await fetch('/trips');
    if (!response.ok) throw new Error('Failed to fetch trips');

    const trips = await response.json();

    const tripList = document.getElementById('trip-list');
    tripList.innerHTML = ''; // Clear existing content

    trips.forEach(trip => {
      const tripCard = document.createElement('div');
      tripCard.className = 'trip-card';

      tripCard.innerHTML = `
        <div class="card-image">
          <img src="${trip.photos && trip.photos[0] ? trip.photos[0] : 'placeholder.jpg'}" alt="Trip Photo">
        </div>
        <div class="card-content">
          <h3>${trip.title || 'Untitled Trip'}</h3>
          <p>${trip.days || 0} Days / ${trip.nights || 0} Nights</p>
          <p>Cost: $${trip.expense || 0}</p>
          <button class="delete-trip-btn" data-id="${trip.id}">Delete</button>
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
    document.getElementById('trip-list').innerHTML = `
      <p>Failed to load trips. Please try again later.</p>
    `;
  }
}

// Add event listeners to delete buttons
function addDeleteFunctionality() {
  document.querySelectorAll('.delete-trip-btn').forEach(button => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation(); // Prevent card click event
      event.preventDefault(); // Prevent default button action

      const tripId = button.dataset.id;

      const confirmDelete = confirm('Are you sure you want to delete this trip?');
      if (!confirmDelete) return;

      try {
        const response = await fetch(`/trips/${tripId}`, { method: 'DELETE' });
        if (response.ok) {
          alert('Trip deleted successfully');
          loadTrips(); // Refresh the list
        } else {
          alert('Failed to delete trip');
          console.error('Delete failed:', response.statusText);
        }
      } catch (error) {
        alert('Error deleting trip');
        console.error('Error:', error.message);
      }
    });
  });
}

// Load trips on page load
loadTrips();
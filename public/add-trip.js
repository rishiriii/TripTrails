// Stops array to hold the list of stops
const stops = [];

// Event listener to handle adding stops
document.getElementById('add-stop-btn').addEventListener('click', () => {
  const stopInput = document.getElementById('stop-input');
  const stopValue = stopInput.value.trim();

  if (stopValue) {
    stops.push(stopValue); // Add the stop to the array

    // Add the stop to the UI
    const stopListItem = document.createElement('div');
    stopListItem.textContent = stopValue;
    stopListItem.classList.add('stop-item');

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Remove';
    deleteButton.addEventListener('click', () => {
      stops.splice(stops.indexOf(stopValue), 1); // Remove stop from array
      stopListItem.remove(); // Remove from UI
    });

    stopListItem.appendChild(deleteButton);
    document.getElementById('stops-container').appendChild(stopListItem);

    stopInput.value = ''; // Clear the input field
  }
});

// Submit event for the form
document.getElementById('add-trip-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  // Gather form data
  const formData = new FormData(event.target);
  const newTrip = Object.fromEntries(formData.entries());

  // Include the stops array in the trip data
  newTrip.stops = stops;

  // Send the new trip data to the server
  await fetch('/trips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newTrip),
  });

  // Redirect back to homepage
  window.location.href = 'index.html';
});

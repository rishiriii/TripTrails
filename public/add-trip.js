// Stops array to hold the list of stops
import { storage } from '../firebase.js'; // Import Firebase Storage
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

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

// Submit event for the trip form
document.getElementById('add-trip-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  // Gather form data
  const formData = new FormData(event.target);
  const newTrip = Object.fromEntries(formData.entries());

  // Automatically generate the title from the start and end fields
  const start = formData.get('start');
  const end = formData.get('end');
  newTrip.title = `${start} - ${end}`;
  newTrip.stops = stops; // Include the stops array in the trip data

  // Send the trip data to the server
  let tripId;
  try {
    const tripResponse = await fetch('/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTrip),
    });

    if (!tripResponse.ok) throw new Error('Failed to save trip data.');

    const tripData = await tripResponse.json();
    tripId = tripData.id; // Store the trip ID for later use
    console.log('Trip saved successfully.', tripData);
    alert('Trip added successfully!');
  } catch (error) {
    console.error('Error saving trip:', error.message);
    alert('Failed to save trip. Please try again.');
    return; // Stop here if trip saving fails
  }

  // Handle banner photo upload
  const fileInput = document.getElementById('file');
  const file = fileInput?.files[0]; // Optional chaining to check if the file input exists

  if (file && tripId) {
    const fileRef = ref(storage, `banners/${tripId}_${file.name}`);
    try {
      // Upload the file to Firebase Storage
      const snapshot = await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Update the trip with the bannerPhoto URL
      const patchResponse = await fetch(`/trips/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bannerPhoto: downloadURL }),
      });

      if (!patchResponse.ok) {
        throw new Error('Failed to update trip with banner photo.');
      }

      alert('Trip and banner photo added successfully!');
    } catch (error) {
      console.error('Error uploading banner photo:', error.message);
      alert('Failed to upload banner photo. Please try again.');
    }
  }

  // Redirect back to homepage
  window.location.href = 'Home.html';
});

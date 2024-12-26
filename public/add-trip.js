import { storage } from '../firebase.js'; // Import Firebase Storage
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // Correct Firebase Storage methods

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

  // Automatically generate the title
  const start = formData.get('start');
  const end = formData.get('end');
  newTrip.title = `${start} - ${end}`;

  // Add stops array
  newTrip.stops = stops;

  // Handle file upload for banner photo
  const fileInput = document.getElementById('file');
  const file = fileInput?.files[0];

  if (file) {
    const storageRef = ref(storage, `banners/${file.name}`); // Create a reference in Firebase Storage
    try {
      const snapshot = await uploadBytes(storageRef, file); // Upload the file
      const bannerPhotoURL = await getDownloadURL(snapshot.ref); // Get the download URL

      // Add bannerPhoto URL to the trip data
      newTrip.bannerPhoto = bannerPhotoURL;
    } catch (error) {
      console.error('Error uploading banner photo:', error.message);
      alert('Failed to upload banner photo. Please try again.');
      return; // Stop form submission if the upload fails
    }
  }

  // Send trip data to the backend
  try {
    const response = await fetch('/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTrip),
    });

    if (!response.ok) {
      throw new Error('Failed to save trip data.');
    }

    alert('Trip added successfully!');
    window.location.href = 'Home.html'; // Redirect to home page
  } catch (error) {
    console.error('Error saving trip:', error.message);
    alert('Failed to save trip. Please try again.');
  }
});

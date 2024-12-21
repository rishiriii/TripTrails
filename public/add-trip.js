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

  // Include the stops array in the trip data
  newTrip.stops = stops;

  // Send the trip data to the server
  try {
    const tripResponse = await fetch('/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTrip),
    });

    if (!tripResponse.ok) {
      throw new Error('Failed to save trip data.');
    }

    console.log('Trip saved successfully.');
    alert('Trip added successfully!');
  } catch (error) {
    console.error('Error saving trip:', error.message);
    alert('Failed to save trip. Please try again.');
    return; // Stop here if trip saving fails
  }

  // If trip saving succeeds, handle file upload
  const fileInput = document.getElementById('file');
  const file = fileInput?.files[0]; // Optional chaining to check if the file input exists

  if (file) {
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    try {
      const uploadResponse = await fetch('http://localhost:3000/drive/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        throw new Error('File upload failed.');
      }

      const result = await uploadResponse.json();
      console.log('File uploaded successfully:', result);
      alert(`File uploaded successfully. File ID: ${result.fileId}`);
    } catch (error) {
      console.error('Error uploading file:', error.message);
      alert('File upload failed. Please check the console for more details.');
    }
  }

  // Redirect back to homepage
  window.location.href = 'Home.html';
});


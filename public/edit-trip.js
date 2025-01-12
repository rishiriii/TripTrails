import { auth, storage } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const urlParams = new URLSearchParams(window.location.search);
const tripId = urlParams.get('id');

let currentTrip = null;
let newMediaFiles = [];
let removedMediaUrls = [];
let stops = [];

function initializeAutocomplete(inputId) {
  const input = document.getElementById(inputId);
  const autocomplete = new google.maps.places.Autocomplete(input, {
    types: ['(cities)'],
    fields: ['address_components', 'name']
  });

  // Extract only city name from the selected place
  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    if (place.address_components) {
      // Find the city component
      const cityComponent = place.address_components.find(component => 
        component.types.includes('locality')
      );
      if (cityComponent) {
        input.value = cityComponent.long_name;
        updateTitle(); // Update title when location changes
      }
    }
  });
}

function createStopElement(stopLocation = '', index) {
  const stopDiv = document.createElement('div');
  stopDiv.className = 'stop-item';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.value = stopLocation;
  input.placeholder = 'Enter stop location';
  input.className = 'stop-input';
  input.id = `stop-${Date.now()}-${index}`; // Ensure unique ID even for rerendered elements
  
  // Update stops array when input changes
  input.addEventListener('input', (e) => {
    stops[index] = e.target.value;
  });
  
  const upBtn = document.createElement('button');
  upBtn.textContent = '↑';
  upBtn.type = 'button';
  upBtn.onclick = () => moveStop(index, 'up');
  
  const downBtn = document.createElement('button');
  downBtn.textContent = '↓';
  downBtn.type = 'button';
  downBtn.onclick = () => moveStop(index, 'down');
  
  const removeBtn = document.createElement('button');
  removeBtn.textContent = '✕';
  removeBtn.type = 'button';
  removeBtn.onclick = () => removeStop(index);
  
  stopDiv.appendChild(input);
  stopDiv.appendChild(upBtn);
  stopDiv.appendChild(downBtn);
  stopDiv.appendChild(removeBtn);

  // Initialize autocomplete after the element is added to the DOM
  setTimeout(() => {
    const autocomplete = new google.maps.places.Autocomplete(input, {
      types: ['(cities)'],
      fields: ['address_components', 'name']
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.address_components) {
        const cityComponent = place.address_components.find(component => 
          component.types.includes('locality')
        );
        if (cityComponent) {
          input.value = cityComponent.long_name;
          stops[index] = cityComponent.long_name; // Update stops array with selected city
        }
      }
    });
  }, 0);
  
  return stopDiv;
}

function moveStop(index, direction) {
  const newIndex = direction === 'up' ? index - 1 : index + 1;
  if (newIndex >= 0 && newIndex < stops.length) {
    [stops[index], stops[newIndex]] = [stops[newIndex], stops[index]];
    renderStops();
  }
}

function removeStop(index) {
  stops.splice(index, 1);
  renderStops();
}

function renderStops() {
  const container = document.getElementById('stops-container');
  container.innerHTML = '';
  stops.forEach((stop, index) => {
    const stopElement = createStopElement(stop, index);
    container.appendChild(stopElement);
  });
}

function addStop() {
  stops.push('');
  renderStops();
}

// Update title to include stops
function updateTitle() {
  const start = document.getElementById('start').value || 'Unknown';
  const end = document.getElementById('end').value || 'Unknown';
  document.getElementById('title').value = `${start} - ${end}`;
}

// Calculate trip duration from dates
function calculateTripDuration(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = end.getTime() - start.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  return {
    days: daysDiff + 1,
    nights: daysDiff
  };
}

// Update duration display
function updateDurationDisplay() {
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  
  if (startDate && endDate) {
    if (new Date(endDate) < new Date(startDate)) {
      document.getElementById('duration-display').textContent = 'End date cannot be before start date';
      return false;
    }
    
    const { days, nights } = calculateTripDuration(startDate, endDate);
    document.getElementById('duration-display').textContent = `${days} days / ${nights} nights`;
    return true;
  }
  return false;
}

function createMediaPreview(url, container, isVideo = false) {
  const wrapper = document.createElement('div');
  wrapper.className = 'media-preview-item';

  if (isVideo) {
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    video.style.maxWidth = '200px';
    video.style.maxHeight = '200px';
    wrapper.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.src = url;
    img.style.maxWidth = '200px';
    img.style.maxHeight = '200px';
    wrapper.appendChild(img);
  }

  const removeBtn = document.createElement('button');
  removeBtn.textContent = 'Remove';
  removeBtn.className = 'remove-media-btn';
  removeBtn.onclick = () => {
    wrapper.remove();
    if (url.startsWith('http')) {
      removedMediaUrls.push(url);
    }
  };

  wrapper.appendChild(removeBtn);
  container.appendChild(wrapper);
}

async function loadTrip(token) {
  try {
    const response = await fetch(`/trips/${tripId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    currentTrip = await response.json();

    // Populate form fields
    document.getElementById('start').value = currentTrip.originalStart || currentTrip.start || '';
    document.getElementById('end').value = currentTrip.originalEnd || currentTrip.end || '';
    document.getElementById('startDate').value = currentTrip.startDate || '';
    document.getElementById('endDate').value = currentTrip.endDate || '';
    document.getElementById('expense').value = currentTrip.expense || 0;
    document.getElementById('description').value = currentTrip.description || '';

    // Load stops
    stops = [...(currentTrip.stops || [])]; // Create a new array to avoid reference issues
    renderStops();

    // Update duration display
    updateDurationDisplay();

    // Show current banner
    if (currentTrip.bannerPhoto) {
      const bannerContainer = document.getElementById('current-banner');
      createMediaPreview(currentTrip.bannerPhoto, bannerContainer);
    }

    // Show current media
    if (currentTrip.mediaUrls && currentTrip.mediaUrls.length > 0) {
      const mediaContainer = document.getElementById('current-media');
      currentTrip.mediaUrls.forEach(url => {
        const isVideo = url.toLowerCase().match(/\.(mp4|webm|ogg)$/);
        createMediaPreview(url, mediaContainer, isVideo);
      });
    }

    updateTitle();
  } catch (error) {
    console.error('Error loading trip:', error.message);
    alert('Failed to load trip details. Please try again later.');
  }
}

// Handle new media preview
document.getElementById('additional-media').addEventListener('change', (event) => {
  const files = Array.from(event.target.files);
  newMediaFiles = files;
  
  const previewContainer = document.getElementById('new-media-preview');
  previewContainer.innerHTML = '';
  
  files.forEach(file => {
    const objectUrl = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video/');
    createMediaPreview(objectUrl, previewContainer, isVideo);
  });
});

// Handle new banner preview
document.getElementById('banner-file').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const bannerContainer = document.getElementById('current-banner');
    bannerContainer.innerHTML = '';
    createMediaPreview(URL.createObjectURL(file), bannerContainer);
  }
});

async function uploadMedia(file, userId) {
  const fileName = `${Date.now()}-${file.name}`;
  const storagePath = `trips/${userId}/${tripId}/${fileName}`;
  const storageRef = ref(storage, storagePath);
  
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

async function deleteOldMedia(url) {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting old media:', error);
  }
}

async function saveChanges(event) {
  event.preventDefault();

  // Validate dates
  if (!updateDurationDisplay()) {
    alert('Please check your dates. End date cannot be before start date.');
    return;
  }

  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const token = await user.getIdToken(true);
    
    // Upload new banner if provided
    let bannerUrl = currentTrip.bannerPhoto;
    const newBanner = document.getElementById('banner-file').files[0];
    if (newBanner) {
      if (currentTrip.bannerPhoto) {
        await deleteOldMedia(currentTrip.bannerPhoto);
      }
      bannerUrl = await uploadMedia(newBanner, user.uid);
    }

    // Upload new media files
    const newMediaUrls = await Promise.all(
      newMediaFiles.map(file => uploadMedia(file, user.uid))
    );

    // Delete removed media files
    await Promise.all(
      removedMediaUrls.map(url => deleteOldMedia(url))
    );

    // Get current media URLs that weren't removed
    const currentMediaElements = document.getElementById('current-media')
      .querySelectorAll('.media-preview-item img, .media-preview-item video');
    const remainingMediaUrls = Array.from(currentMediaElements)
      .map(el => el.src)
      .filter(url => !removedMediaUrls.includes(url));

    // Gather all stops
    const currentStops = Array.from(document.querySelectorAll('.stop-input'))
      .map(input => input.value.trim())
      .filter(stop => stop !== '');

    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const { days, nights } = calculateTripDuration(startDate, endDate);

    const updatedTrip = {
      title: document.getElementById('title').value,
      start: document.getElementById('start').value.toLowerCase(), // Store lowercase for search
      end: document.getElementById('end').value.toLowerCase(),
      originalStart: document.getElementById('start').value, // Store original case
      originalEnd: document.getElementById('end').value,
      stops: currentStops,
      startDate,
      endDate,
      days,
      nights,
      expense: parseFloat(document.getElementById('expense').value),
      description: document.getElementById('description').value,
      bannerPhoto: bannerUrl,
      mediaUrls: [...remainingMediaUrls, ...newMediaUrls]
    };

    const response = await fetch(`/trips/${tripId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedTrip),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update trip');
    }

    alert('Trip updated successfully');
    window.location.href = 'my-trips.html';
  } catch (error) {
    console.error('Error updating trip:', error.message);
    alert('Failed to update trip. Please try again later.');
  }
}

function initializeForm() {
  const form = document.getElementById('edit-trip-form');
  if (form) {
    form.addEventListener('submit', saveChanges);

    // Initialize autocomplete for start and end locations
    initializeAutocomplete('start');
    initializeAutocomplete('end');

    // Add listeners for location changes
    const startInput = document.getElementById('start');
    const endInput = document.getElementById('end');
    startInput.addEventListener('input', updateTitle);
    endInput.addEventListener('input', updateTitle);

    // Add listener for add stop button
    document.getElementById('add-stop-btn').addEventListener('click', addStop);

    // Add listeners for date changes
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    startDateInput.addEventListener('change', updateDurationDisplay);
    endDateInput.addEventListener('change', updateDurationDisplay);
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      alert('You must be logged in to edit trips.');
      window.location.href = 'login.html';
      return;
    }

    try {
      const token = await user.getIdToken(true);
      await loadTrip(token);
    } catch (error) {
      console.error('Error initializing form:', error);
      alert('Failed to load trip details. Please try again later.');
    }
  });
}

document.addEventListener('DOMContentLoaded', initializeForm);
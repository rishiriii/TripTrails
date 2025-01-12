import { auth, storage } from '../firebase.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

let stops = [];
let mediaFiles = [];

function initializeAutocomplete(inputId) {
  const input = document.getElementById(inputId);
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
  input.id = `stop-${Date.now()}-${index}`;
  
  input.addEventListener('input', (e) => {
    stops[index] = e.target.value;
  });
  
  const upBtn = document.createElement('button');
  upBtn.textContent = '↑';
  upBtn.type = 'button';
  upBtn.className = 'btn-icon';
  upBtn.onclick = () => moveStop(index, 'up');
  
  const downBtn = document.createElement('button');
  downBtn.textContent = '↓';
  downBtn.type = 'button';
  downBtn.className = 'btn-icon';
  downBtn.onclick = () => moveStop(index, 'down');
  
  const removeBtn = document.createElement('button');
  removeBtn.textContent = '✕';
  removeBtn.type = 'button';
  removeBtn.className = 'btn-icon';
  removeBtn.onclick = () => removeStop(index);
  
  stopDiv.appendChild(input);
  stopDiv.appendChild(upBtn);
  stopDiv.appendChild(downBtn);
  stopDiv.appendChild(removeBtn);

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
          stops[index] = cityComponent.long_name;
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

document.getElementById('media-files').addEventListener('change', (event) => {
  const files = Array.from(event.target.files);
  mediaFiles = files;
  
  const previewContainer = document.getElementById('media-preview');
  previewContainer.innerHTML = '';
  
  files.forEach(file => {
    const preview = document.createElement('div');
    preview.className = 'media-preview-item';
    
    if (file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.style.maxWidth = '200px';
      img.style.maxHeight = '200px';
      preview.appendChild(img);
    } else if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.style.maxWidth = '200px';
      video.style.maxHeight = '200px';
      video.controls = true;
      preview.appendChild(video);
    }
    
    previewContainer.appendChild(preview);
  });
});

async function uploadMedia(file, userId, tripId) {
  const fileName = `${Date.now()}-${file.name}`;
  const storagePath = `trips/${userId}/${tripId}/${fileName}`;
  const storageRef = ref(storage, storagePath);
  
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

document.getElementById('add-trip-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Please log in to add a trip');
    
    // Basic validation
    const startLocation = document.getElementById('start-location').value.trim();
    const endLocation = document.getElementById('end-location').value.trim();
    
    if (!startLocation || !endLocation) {
      throw new Error('Please enter both start and end locations');
    }
    
    const token = await user.getIdToken();
    const formData = new FormData(event.target);
    
    // Validate dates
    const startDate = formData.get('startDate');
    const endDate = formData.get('endDate');
    
    if (!startDate || !endDate) {
      throw new Error('Please select both start and end dates');
    }
    
    if (new Date(endDate) < new Date(startDate)) {
      throw new Error('End date cannot be before start date');
    }

    const { days, nights } = calculateTripDuration(startDate, endDate);
    
    // Validate banner photo
    const bannerFile = document.getElementById('banner-file').files[0];
    if (!bannerFile) {
      throw new Error('Please select a banner photo');
    }
    
    // Show loading state
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay active';
    loadingOverlay.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-text">Saving your trip...</div>
      </div>
    `;
    document.body.appendChild(loadingOverlay);
    
    // Generate temporary tripId for storage path
    const tempTripId = Date.now().toString();
    
    // Upload banner
    const bannerUrl = await uploadMedia(bannerFile, user.uid, tempTripId);
    
    // Upload additional media
    const mediaUrls = await Promise.all(
      mediaFiles.map(file => uploadMedia(file, user.uid, tempTripId))
    );

    // Filter out empty stops
    const validStops = stops.filter(stop => stop.trim() !== '');

    const newTrip = {
      start: startLocation.toLowerCase(),
      end: endLocation.toLowerCase(),
      originalStart: startLocation,
      originalEnd: endLocation,
      startDate,
      endDate,
      days,
      nights,
      expense: parseFloat(formData.get('expense')),
      description: formData.get('description'),
      visibility: formData.get('visibility'),
      stops: validStops,
      title: `${startLocation} to ${endLocation}`,
      bannerPhoto: bannerUrl,
      mediaUrls: mediaUrls
    };

    const response = await fetch('/trips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(newTrip),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to save trip data.');
    }

    alert('Trip added successfully!');
    window.location.href = 'home.html';
  } catch (error) {
    console.error('Error saving trip:', error);
    alert(error.message || 'Failed to save trip. Please try again.');
  } finally {
    // Remove loading overlay
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.remove();
    }
  }
});

// Initialize everything when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize autocomplete for start and end locations
  initializeAutocomplete('start-location');
  initializeAutocomplete('end-location');
  
  // Add stop button handler
  document.getElementById('add-stop-btn').addEventListener('click', addStop);
  
  // Add input handlers for title updates
  const startInput = document.getElementById('start-location');
  const endInput = document.getElementById('end-location');
  
});
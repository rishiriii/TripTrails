import { auth, storage } from '../firebase.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const stops = [];
let mediaFiles = [];

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

// Media preview handler
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

// Stops handler
document.getElementById('add-stop-btn').addEventListener('click', () => {
  const stopInput = document.getElementById('stop-input');
  const stopValue = stopInput.value.trim();
  
  if (stopValue) {
    stops.push(stopValue);
    const stopListItem = document.createElement('div');
    stopListItem.textContent = stopValue;
    stopListItem.classList.add('stop-item');
    
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Remove';
    deleteButton.addEventListener('click', () => {
      stops.splice(stops.indexOf(stopValue), 1);
      stopListItem.remove();
    });
    
    stopListItem.appendChild(deleteButton);
    document.getElementById('stops-container').appendChild(stopListItem);
    stopInput.value = '';
  }
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
    
    const token = await user.getIdToken();
    const formData = new FormData(event.target);
    
    // Validate dates
    const startDate = formData.get('startDate');
    const endDate = formData.get('endDate');
    if (new Date(endDate) < new Date(startDate)) {
      throw new Error('End date cannot be before start date');
    }

    const { days, nights } = calculateTripDuration(startDate, endDate);
    
    // Upload banner first
    const bannerFile = document.getElementById('banner-file').files[0];
    if (!bannerFile) throw new Error('Banner photo is required');
    
    // Generate temporary tripId for storage path
    const tempTripId = Date.now().toString();
    const bannerUrl = await uploadMedia(bannerFile, user.uid, tempTripId);
    
    // Upload additional media
    const mediaUrls = await Promise.all(
      mediaFiles.map(file => uploadMedia(file, user.uid, tempTripId))
    );

    const newTrip = {
      start: formData.get('start'),
      end: formData.get('end'),
      startDate,
      endDate,
      days,
      nights,
      expense: parseFloat(formData.get('expense')),
      description: formData.get('description'),
      visibility: formData.get('visibility'),
      stops: stops,
      title: `${formData.get('start')} to ${formData.get('end')}`,
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
  }
});
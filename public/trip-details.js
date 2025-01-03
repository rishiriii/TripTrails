import { auth } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';

const urlParams = new URLSearchParams(window.location.search);
const tripId = urlParams.get('id');

function createMediaElement(url) {
  const container = document.createElement('div');
  container.className = 'media-item';

  if (url.match(/\.(mp4|webm|ogg)$/i)) {
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    video.className = 'media-content';
    container.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Trip Media';
    img.className = 'media-content';
    container.appendChild(img);
  }

  return container;
}

async function loadTripDetails() {
  if (!tripId) {
    document.getElementById('trip-title').textContent = 'No trip ID provided';
    return;
  }

  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const token = await user.getIdToken();
    const response = await fetch(`/trips/${tripId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error('Failed to fetch trip details');

    const trip = await response.json();

    // Populate banner
    const bannerContainer = document.getElementById('trip-banner');
    if (trip.bannerPhoto) {
      bannerContainer.innerHTML = `
        <img src="${trip.bannerPhoto}" 
             alt="Trip Banner" 
             style="width: 100%; height: 300px; object-fit: cover;">`;
    }

    // Populate basic details
    document.getElementById('trip-title').textContent = trip.title || 'No Title';
    document.getElementById('trip-start-end').textContent = 
      `${trip.start || 'Unknown'} to ${trip.end || 'Unknown'}`;
    document.getElementById('trip-days').textContent = 
      `${trip.days || 0} Days / ${trip.nights || 0} Nights`;
    document.getElementById('trip-expense').textContent = 
      `Cost: $${trip.expense || 0}`;
    document.getElementById('trip-description').textContent = 
      trip.description || 'No description available';

    // Populate stops
    const stopsList = document.getElementById('trip-stops');
    stopsList.innerHTML = trip.stops?.length 
      ? trip.stops.map(stop => `<li>${stop}</li>`).join('')
      : '<li>No stops available</li>';

    // Populate media gallery
    const mediaContainer = document.getElementById('media-container');
    if (trip.mediaUrls?.length) {
      trip.mediaUrls.forEach(url => {
        mediaContainer.appendChild(createMediaElement(url));
      });
    } else {
      mediaContainer.innerHTML = '<p>No additional media available</p>';
    }

    document.getElementById('trip-username').textContent = 
      `Posted by: ${trip.userEmail || 'Unknown user'}`;
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('trip-title').textContent = 'Failed to load trip';
  }
}

onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    loadTripDetails();
  }
});
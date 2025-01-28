import { auth } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';

const urlParams = new URLSearchParams(window.location.search);
const tripId = urlParams.get('id');
let isLiked = false;

function createMediaGrid(bannerUrl, mediaUrls = []) {
  const mediaGrid = document.getElementById('media-grid');
  mediaGrid.innerHTML = '';

  // Create carousel track
  const carouselTrack = document.createElement('div');
  carouselTrack.className = 'carousel-track';

  // Combine all media into pairs
  const allMedia = bannerUrl ? [bannerUrl, ...mediaUrls] : mediaUrls;
  const pairs = [];
  
  for (let i = 0; i < allMedia.length; i += 2) {
    pairs.push(allMedia.slice(i, i + 2));
  }

  // Create slides for each pair
  pairs.forEach(pair => {
    const slide = document.createElement('div');
    slide.className = 'media-item';
    
    // Create media elements for the pair
    pair.forEach(url => {
      if (url.match(/\.(mp4|webm|ogg)$/i)) {
        slide.innerHTML += `
          <video src="${url}" controls class="media-content"></video>
        `;
      } else {
        slide.innerHTML += `
          <img src="${url}" alt="Trip Media" class="media-content">
        `;
      }
    });
    
    carouselTrack.appendChild(slide);
  });

  // Add navigation buttons
  const prevButton = document.createElement('button');
  prevButton.className = 'carousel-button prev hidden';
  prevButton.innerHTML = '←';

  const nextButton = document.createElement('button');
  nextButton.className = 'carousel-button next';
  nextButton.innerHTML = '→';

  // Add dots indicator
  const dotsContainer = document.createElement('div');
  dotsContainer.className = 'carousel-dots';

  // Add all elements to the container
  mediaGrid.appendChild(carouselTrack);
  mediaGrid.appendChild(prevButton);
  mediaGrid.appendChild(nextButton);
  mediaGrid.appendChild(dotsContainer);

  // Initialize carousel
  initializeCarousel(carouselTrack, prevButton, nextButton, dotsContainer, pairs.length);
}

function initializeCarousel(track, prevButton, nextButton, dotsContainer, totalSlides) {
  let currentIndex = 0;

  // Create dots
  for (let i = 0; i < totalSlides; i++) {
    const dot = document.createElement('div');
    dot.className = `dot ${i === 0 ? 'active' : ''}`;
    dot.addEventListener('click', () => goToSlide(i));
    dotsContainer.appendChild(dot);
  }

  // Update carousel state
  function updateCarousel() {
    // Update track position
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    
    // Update buttons visibility
    prevButton.className = `carousel-button prev ${currentIndex === 0 ? 'hidden' : ''}`;
    nextButton.className = `carousel-button next ${currentIndex === totalSlides - 1 ? 'hidden' : ''}`;
    
    // Update dots
    const dots = dotsContainer.getElementsByClassName('dot');
    Array.from(dots).forEach((dot, index) => {
      dot.className = `dot ${index === currentIndex ? 'active' : ''}`;
    });
  }

  // Navigation functions
  function goToSlide(index) {
    currentIndex = index;
    updateCarousel();
  }

  prevButton.addEventListener('click', () => {
    if (currentIndex > 0) {
      goToSlide(currentIndex - 1);
    }
  });

  nextButton.addEventListener('click', () => {
    if (currentIndex < totalSlides - 1) {
      goToSlide(currentIndex + 1);
    }
  });

  // Initialize carousel state
  updateCarousel();
}

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

async function incrementViews() {
  try {
    const token = await auth.currentUser.getIdToken();
    const response = await fetch(`/trips/${tripId}/views`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      document.getElementById('viewCount').textContent = data.views;
    }
  } catch (error) {
    console.error('Error updating views:', error);
  }
}

async function loadLikeState() {
  try {
    const token = await auth.currentUser.getIdToken();
    const response = await fetch(`/trips/${tripId}/likes`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      document.getElementById('likeCount').textContent = data.totalLikes;
      isLiked = data.isLikedByUser;
      updateLikeButtonAppearance();
    }
  } catch (error) {
    console.error('Error loading likes:', error);
  }
}

function updateLikeButtonAppearance() {
  const likeButton = document.getElementById('likeButton');
  const heartSpan = likeButton.querySelector('.heart');
  
  if (isLiked) {
    heartSpan.textContent = '♥';
    likeButton.classList.add('liked');
  } else {
    heartSpan.textContent = '♡';
    likeButton.classList.remove('liked');
  }
}

async function handleLike() {
  try {
    const token = await auth.currentUser.getIdToken();
    const response = await fetch(`/trips/${tripId}/likes`, {
      method: isLiked ? 'DELETE' : 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      document.getElementById('likeCount').textContent = data.totalLikes;
      isLiked = data.isLikedByUser;
      updateLikeButtonAppearance();
    }
  } catch (error) {
    console.error('Error updating like:', error);
  }
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

    // Create media grid with banner and media
    createMediaGrid(trip.bannerPhoto, trip.mediaUrls);

    // Format location names - capitalize first letter of each word
    const formatLocation = (location) => {
      if (!location) return '';
      return location
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    // Populate trip details with properly formatted locations
    document.getElementById('trip-title').textContent = trip.title || 'No Title';
    document.getElementById('trip-start-end').textContent = 
      `${formatLocation(trip.start) || 'Unknown'} to ${formatLocation(trip.end) || 'Unknown'}`;
    document.getElementById('trip-days').textContent = 
      `${trip.days || 0} Days / ${trip.nights || 0} Nights`;
    document.getElementById('trip-expense').textContent = 
      `$${trip.expense || 0}`;
    document.getElementById('trip-description').textContent = 
      trip.description || 'No description available';

    // Update username display
   const username = trip.authorUsername || trip.authorDisplayName || 'Unknown user';
document.getElementById('trip-username').textContent = `Posted by: ${username}`;

    // Populate stops with start and destination, ensuring proper capitalization
    const stopsList = document.getElementById('trip-stops');
    let stopsHTML = '';
    
    // Add start point
    stopsHTML += `
      <li class="point start-point">
        <div class="point-marker"></div>
        <div class="point-text">${formatLocation(trip.start) || 'Start'}</div>
      </li>`;
    
    // Add intermediate stops
    if (trip.stops?.length) {
      stopsHTML += trip.stops
        .map(stop => `
          <li class="stop-point">
            <div class="point-marker"></div>
            <div class="point-text">${formatLocation(stop)}</div>
          </li>`)
        .join('');
    }
    
    // Add destination point
    stopsHTML += `
      <li class="point end-point">
        <div class="point-marker"></div>
        <div class="point-text">${formatLocation(trip.end) || 'Destination'}</div>
      </li>`;
    
    stopsList.innerHTML = stopsHTML;


    await incrementViews();
    await loadLikeState();

    // Add like button event listener
    document.getElementById('likeButton').addEventListener('click', handleLike);
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
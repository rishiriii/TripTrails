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

    // Populate trip details
    document.getElementById('trip-title').textContent = trip.title || 'No Title';
    document.getElementById('trip-start-end').textContent = 
      `${formatLocation(trip.start) || 'Unknown'} to ${formatLocation(trip.end) || 'Unknown'}`;
    document.getElementById('trip-days').textContent = 
      `${trip.days || 0} Days / ${trip.nights || 0} Nights`;
    document.getElementById('trip-expense').textContent = 
      `$${trip.expense || 0}`;
    document.getElementById('trip-description').textContent = 
      trip.description || 'No description available';
    document.getElementById('trip-username').textContent = 
      `Posted by: ${trip.authorUsername || trip.authorDisplayName || 'Unknown user'}`;

    // Populate stops
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
    await displayNearbyAttractions(trip.end);
    
    // Add like button event listener
    document.getElementById('likeButton').addEventListener('click', handleLike);
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('trip-title').textContent = 'Failed to load trip';
  }
}

async function fetchNearbyAttractions(location) {
  try {
    if (!google?.maps?.places) {
      console.warn('Google Maps Places API not loaded');
      return [];
    }

    // Create PlacesService instance using a temporary map div
    const mapDiv = document.createElement('div');
    const map = new google.maps.Map(mapDiv, {
      center: { lat: 0, lng: 0 },
      zoom: 1
    });
    const service = new google.maps.places.PlacesService(map);

    // First get location coordinates using Geocoding service
    const geocoder = new google.maps.Geocoder();
    
    try {
      const geocodeResult = await new Promise((resolve, reject) => {
        geocoder.geocode({ address: location }, (results, status) => {
          if (status === 'OK') {
            resolve(results[0].geometry.location);
          } else {
            // Handle specific geocoding errors
            switch(status) {
              case 'ZERO_RESULTS':
                reject(new Error('Location not found'));
                break;
              case 'OVER_QUERY_LIMIT':
                reject(new Error('API quota exceeded'));
                break;
              default:
                reject(new Error(`Geocoding failed: ${status}`));
            }
          }
        });
      });

      // Then search for tourist attractions nearby
      const request = {
        location: geocodeResult,
        radius: '5000', // 5km radius
        type: ['landmark','park','museum','zoo','amusement_park','aquarium','art_gallery','church','hindu_temple','mosque','synagogue','city_hall','courthouse','library','stadium'],
        rankBy: google.maps.places.RankBy.RATING
      };

      const placesResult = await new Promise((resolve, reject) => {
        service.nearbySearch(request, (results, status) => {
          if (status === 'OK') {
            resolve(results.slice(0, 20)); // Limit to 20 places
          } else {
            reject(new Error(`Places search failed: ${status}`));
          }
        });
      });

      return placesResult;
    } catch (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error fetching nearby attractions:', error);
    return [];
  }
}

function createAttractionCard(place) {
  const card = document.createElement('div');
  card.className = 'attraction-card';
  
  // Default image path
  const defaultImagePath = '/images/placeholder-attraction.jpg';
  
  // Try to get photo URL with error handling
  let photoUrl = defaultImagePath;
  try {
    if (place.photos && place.photos[0]) {
      photoUrl = place.photos[0].getUrl({
        maxWidth: 200,
        maxHeight: 200
      });
    }
  } catch (error) {
    console.warn('Failed to get photo URL for place:', place.name);
    photoUrl = defaultImagePath;
  }

  const ratingStars = place.rating 
    ? '★'.repeat(Math.floor(place.rating)) + '☆'.repeat(5 - Math.floor(place.rating))
    : '☆☆☆☆☆';

  card.innerHTML = `
    <div class="attraction-image-container">
      <img 
        src="${photoUrl}" 
        alt="${place.name}"
        class="attraction-image"
        onerror="this.onerror=null; this.src='${defaultImagePath}'"
      >
    </div>
    <div class="attraction-details">
      <h3>${place.name}</h3>
      <div class="rating">
        ${place.rating ? `
          <span class="stars" title="${place.rating} out of 5 stars">${ratingStars}</span>
          <span class="rating-text">${place.rating.toFixed(1)} (${place.user_ratings_total || 0} reviews)</span>
        ` : '<span class="no-rating">No ratings yet</span>'}
      </div>
      ${place.vicinity ? `<p class="vicinity">${place.vicinity}</p>` : ''}
    </div>
  `;

  card.addEventListener('click', () => {
    const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${place.place_id}`;
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  });

  return card;
}

async function displayNearbyAttractions(location) {
  // Create container for attractions section
  const attractionsSection = document.createElement('div');
  attractionsSection.className = 'attractions-section';
  attractionsSection.innerHTML = `
    <h2>Popular Attractions Nearby</h2>
    <div class="attractions-container">
      <div class="attractions-scroll">
        <div class="loading-spinner"></div>
      </div>
    </div>
  `;

  // Insert after the timeline container
  const timelineContainer = document.querySelector('.timeline-container');
  timelineContainer.insertAdjacentElement('afterend', attractionsSection);

  try {
    // Fetch attractions
    const attractions = await fetchNearbyAttractions(location);
    const scrollContainer = attractionsSection.querySelector('.attractions-scroll');
    
    // Handle no results
    if (!attractions || attractions.length === 0) {
      scrollContainer.innerHTML = `
        <div class="no-attractions">
          <p>Unable to load attractions for this location.</p>
          <p>You can still explore the area on 
            <a href="https://www.google.com/maps/search/attractions+in+${encodeURIComponent(location)}" 
               target="_blank" rel="noopener noreferrer">Google Maps</a>
          </p>
        </div>
      `;
      return;
    }

    // Display attractions
    scrollContainer.innerHTML = '';
    attractions.forEach(place => {
      const card = createAttractionCard(place);
      scrollContainer.appendChild(card);
    });

  } catch (error) {
    const scrollContainer = attractionsSection.querySelector('.attractions-scroll');
    scrollContainer.innerHTML = `
      <div class="error-message">
        <p>${error.message}</p>
        <p>You can still explore the area on 
          <a href="https://www.google.com/maps/search/attractions+in+${encodeURIComponent(location)}" 
             target="_blank" rel="noopener noreferrer">Google Maps</a>
        </p>
      </div>
    `;
  }
}

// Initialize the page when authentication state changes
onAuthStateChanged(auth, user => {
if (!user) {
  window.location.href = 'login.html';
} else {
  loadTripDetails();
}
});
          
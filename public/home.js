// Import Firebase auth if needed
import { auth } from '../firebase.js';

// Firebase auth will be available globally


// Wait for auth to be ready and get token
async function getAuthToken() {
  // Wait for auth initialization
  await new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe(); // Unsubscribe after first state change
      resolve(user);
    });
  });

  const user = auth.currentUser;
  if (!user) {
    // Redirect to login if no user
    window.location.href = '/login.html';
    return null;
  }
  return user.getIdToken();
}

// Fetch popular destinations from Firebase backend
async function fetchPopularDestinations() {
  try {
    const token = await getAuthToken();
    if (!token) return []; // Return empty if no token

    const response = await fetch('/api/trips/popular-destinations', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching popular destinations:', error);
    return [];
  }
}

// Populate destination slider with data from Firebase
async function populateDestinations() {
  const slider = document.getElementById('destinationSlider');
  
  // Show loading state
  slider.innerHTML = `
    <div class="loading">
      <div class="loading-spinner"></div>
      <div>Loading popular destinations...</div>
    </div>
  `;
  
  try {
    const destinations = await fetchPopularDestinations();
    
    if (destinations.length === 0) {
      slider.innerHTML = `
        <div class="no-data">
          <p>No destinations found</p>
          <button onclick="window.location.href='add-trip.html'" class="add-first-trip">
            Add Your First Trip
          </button>
        </div>
      `;
      return;
    }

    slider.innerHTML = ''; // Clear loading message
    
    destinations.forEach(dest => {
      const card = document.createElement('div');
      card.className = 'destination-card';
      
      card.innerHTML = `
        <img 
          src="${dest.image_url || '/images/placeholder.jpg'}" 
          alt="${dest.location}"
          loading="lazy"
          onerror="this.src='/images/placeholder.jpg'"
        >
        <div class="destination-info">
          <h3>${dest.location}</h3>
          <div class="stats">
            <span class="trip-count">${dest.trip_count} trips</span>
            ${dest.views ? `<span class="views">👁 ${dest.views}</span>` : ''}
            ${dest.likes ? `<span class="likes">❤️ ${dest.likes}</span>` : ''}
          </div>
        </div>
      `;
      
      // Add click handler to navigate to filtered explore page
      card.addEventListener('click', () => {
        window.location.href = `/explore.html?location=${encodeURIComponent(dest.location)}`;
      });
      
      slider.appendChild(card);
    });
  } catch (error) {
    console.error('Error populating destinations:', error);
    slider.innerHTML = `
      <div class="error-message">
        <p>Unable to load popular destinations</p>
        <button onclick="populateDestinations()" class="retry-button">
          Try Again
        </button>
      </div>
    `;
  }
}
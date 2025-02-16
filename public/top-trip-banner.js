// top-trips-banner.js
import { db } from '../firebase.js';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

// Create and inject banner HTML structure
function createBannerStructure() {
  const gallerySection = document.querySelector('.gallery .container');
  if (!gallerySection) return;

  gallerySection.innerHTML = `
    <div class="banner-container">
      <div class="banner-track">
        <!-- Banners will be dynamically inserted here -->
      </div>
    </div>
  `;

  // Add required styles
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    .banner-container {
      width: 100%;
      height: 500px;
      position: relative;
      overflow: hidden;
    }

    .banner-track {
      display: flex;
      animation: scroll 30s linear infinite;
    }

    .banner-track:hover {
      animation-play-state: paused;
    }

    .banner-item {
      width: 400px;
      height: 500px;
      flex-shrink: 0;
      padding: 10px;
      position: relative;
      cursor: pointer;
      transition: transform 0.3s ease;
    }

    .banner-item:hover {
      transform: scale(1.05);
    }

    .banner-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 10px;
    }

    .banner-overlay {
      position: absolute;
      bottom: 20px;
      left: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 15px;
      border-radius: 8px;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .banner-item:hover .banner-overlay {
      opacity: 1;
    }

    .banner-title {
      font-size: 1.2em;
      margin-bottom: 5px;
    }

    .banner-details {
      font-size: 0.9em;
      color: #ccc;
    }

    .banner-stats {
      display: flex;
      gap: 15px;
      margin-top: 5px;
      font-size: 0.8em;
    }

    @keyframes scroll {
      0% {
        transform: translateX(0);
      }
      100% {
        transform: translateX(calc(-400px * 6));
      }
    }
  `;
  document.head.appendChild(styleSheet);
}

// Fetch top 10 most viewed trips
async function fetchTopTrips() {
  try {
    const q = query(
      collection(db, 'trips'),
      orderBy('views', 'desc'),
      limit(10)
    );

    const querySnapshot = await getDocs(q);
    const trips = [];
    querySnapshot.forEach((doc) => {
      trips.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return trips;
  } catch (error) {
    console.error('Error fetching top trips:', error);
    return [];
  }
}

// Create banner items from trips data
function createBannerItems(trips) {
  const bannerTrack = document.querySelector('.banner-track');
  if (!bannerTrack) return;

  // Create banner items for original trips
  const bannerHTML = trips.map(trip => `
    <div class="banner-item" onclick="window.location.href='trip-details.html?id=${trip.id}'">
      <img src="${trip.bannerPhoto || '/api/placeholder/400/500'}" alt="${trip.start} to ${trip.end}" class="banner-image">
      <div class="banner-overlay">
        <div class="banner-title">${trip.start} to ${trip.end}</div>
        <div class="banner-details">${trip.days} Days • $${trip.expense?.toLocaleString() || 0}</div>
        <div class="banner-stats">
          <span>👁️ ${trip.views?.toLocaleString() || 0} views</span>
          <span>❤️ ${trip.likes?.toLocaleString() || 0} likes</span>
        </div>
      </div>
    </div>
  `).join('');

  // Add original banners plus first 4 duplicated for smooth loop
  bannerTrack.innerHTML = bannerHTML + trips.slice(0, 4).map(trip => `
    <div class="banner-item" onclick="window.location.href='trip-details.html?id=${trip.id}'">
      <img src="${trip.bannerPhoto || '/api/placeholder/400/500'}" alt="${trip.start} to ${trip.end}" class="banner-image">
      <div class="banner-overlay">
        <div class="banner-title">${trip.start} to ${trip.end}</div>
        <div class="banner-details">${trip.days} Days • $${trip.expense?.toLocaleString() || 0}</div>
        <div class="banner-stats">
          <span>👁️ ${trip.views?.toLocaleString() || 0} views</span>
          <span>❤️ ${trip.likes?.toLocaleString() || 0} likes</span>
        </div>
      </div>
    </div>
  `).join('');

  // Update track width based on total number of items
  bannerTrack.style.width = `${(trips.length + 4) * 400}px`;
}

// Initialize banner
async function initTopTripsBanner() {
  createBannerStructure();
  const trips = await fetchTopTrips();
  if (trips.length > 0) {
    createBannerItems(trips);
  } else {
    const bannerTrack = document.querySelector('.banner-track');
    if (bannerTrack) {
      bannerTrack.innerHTML = '<p>No trips found</p>';
    }
  }
}

// Export for use in home.js
export { initTopTripsBanner };
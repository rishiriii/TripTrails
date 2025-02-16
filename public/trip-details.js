import { auth } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';

const urlParams = new URLSearchParams(window.location.search);
const tripId = urlParams.get('id');
let isLiked = false;
let googleMapsLoadAttempts = 0;
const MAX_LOAD_ATTEMPTS = 20; // 2 seconds maximum wait time

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

    // Format currency
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount || 0);
    };

    // Populate trip details
    document.getElementById('trip-title').textContent = trip.title || 'No Title';
    document.getElementById('trip-start-end').textContent = 
      `${formatLocation(trip.start) || 'Unknown'} to ${formatLocation(trip.end) || 'Unknown'}`;
    document.getElementById('trip-days').textContent = 
      `${trip.days || 0} Days / ${trip.nights || 0} Nights`;
    
    // Updated expense section to include number of people and per-person expense
    const expenseSection = document.getElementById('trip-expense');
    expenseSection.innerHTML = `
      <div class="expense-details">
        <div class="expense-item">
          <span class="expense-label">Total Expense:</span>
          <span class="expense-value">${formatCurrency(trip.expense)}</span>
        </div>
        <div class="expense-item">
          <span class="expense-label">Number of People:</span>
          <span class="expense-value">${trip.numberOfPeople || 1}</span>
        </div>
        <div class="expense-item highlight">
          <span class="expense-label">Per Person:</span>
          <span class="expense-value">${formatCurrency(trip.perPersonExpense)}</span>
        </div>
      </div>
    `;
    
    document.getElementById('trip-description').textContent = 
      trip.description || 'No description available';

    // Updated profile photo handling
    const authorPhoto = document.getElementById('author-photo');
    const authorName = document.getElementById('trip-username');
    const authorContainer = authorPhoto.parentElement;
    showUserProfileModal(trip.authorUid); // Pass the UID
    // Add author ID to the container
    authorContainer.dataset.authorId = trip.authorId;
    
    if (trip.authorPhotoURL) {
      authorPhoto.onerror = function() {
        this.onerror = null; 
        this.src = '/images/default-profile.jpg';
      };
      authorPhoto.src = trip.authorPhotoURL;
    } else {
      authorPhoto.src = '/images/default-profile.jpg';
    }
    
    authorName.textContent = `Posted by: ${trip.authorDisplayName || 'Unknown user'}`;
    
    // Make both photo and name clickable
    authorContainer.style.cursor = 'pointer';
    authorContainer.addEventListener('click', () => {
      showUserProfileModal(trip.authorUid, trip.authorDisplayName, trip.authorPhotoURL);
    });
    
    // Add hover effect
    authorContainer.addEventListener('mouseenter', () => {
      authorName.style.textDecoration = 'underline';
    });
    
    authorContainer.addEventListener('mouseleave', () => {
      authorName.style.textDecoration = 'none';
    });

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
    await displayNearbyHotels(trip.end);
    
    // Add like button event listener
    document.getElementById('likeButton').addEventListener('click', handleLike);
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('trip-title').textContent = 'Failed to load trip';
  }
}

async function waitForGoogleMaps() {
  return new Promise((resolve, reject) => {
    const checkAPI = setInterval(() => {
      googleMapsLoadAttempts++;
      
      // Check if Google Maps is loaded
      if (window.google && window.google.maps && window.google.maps.places) {
        clearInterval(checkAPI);
        console.log('Google Maps API loaded successfully');
        resolve();
      }
      
      // Give up after max attempts (2 seconds)
      if (googleMapsLoadAttempts >= MAX_LOAD_ATTEMPTS) {
        clearInterval(checkAPI);
        reject(new Error('Google Maps API failed to load'));
      }
    }, 100); // Check every 100ms
  });
}

async function fetchNearbyAttractions(location) {
  try {
    await waitForGoogleMaps();

    const mapDiv = document.createElement('div');
    mapDiv.style.display = 'none';
    document.body.appendChild(mapDiv);

    const map = new google.maps.Map(mapDiv, {
      center: { lat: 0, lng: 0 },
      zoom: 1
    });

    const service = new google.maps.places.PlacesService(map);
    const geocoder = new google.maps.Geocoder();

    console.log('Geocoding location:', location);

    const geocodeResult = await new Promise((resolve, reject) => {
      geocoder.geocode({ address: location }, (results, status) => {
        console.log('Geocode status:', status);
        if (status === 'OK') {
          resolve(results[0].geometry.location);
        } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });

    const locationLatLng = {
      lat: geocodeResult.lat(),
      lng: geocodeResult.lng()
    };

    // Expanded list of exclude keywords
    const excludeKeywords = [
      // Businesses and services
      'enterprise', 'enterprises', 'company', 'companies', 'corporation',
      'business', 'office', 'services', 'service', 'consultant',
      'consultancy', 'agency', 'bureau', 'firm', 'limited', 'ltd',
      'private', 'pvt', 'solutions', 'tours', 'travels', 'travel',
      'booking', 'reservation',

      // Healthcare
      'doctor', 'clinic', 'hospital', 'medical', 'healthcare', 'pharmacy',
      'diagnostic', 'laboratory', 'lab', 'dental', 'dentist', 'physician',

      // Education
      'school', 'college', 'university', 'institute', 'academy',
      'education', 'training', 'coaching', 'tuition',

      // Residential
      'house', 'apartment', 'flat', 'residence', 'residential',
      'colony', 'society', 'building', 'tower',

      // Commercial
      'shop', 'store', 'market', 'mall', 'supermarket', 'mart',
      'showroom', 'outlet', 'retail', 'wholesale', 'dealer',

      // Food and accommodation
      'restaurant', 'cafe', 'hotel', 'lodge', 'resort', 'inn',
      'dhaba', 'catering', 'food',

      // Transportation
      'transport', 'cargo', 'logistics', 'courier', 'parking',
      'garage', 'workshop', 'service center',

      // Others
      'bank', 'atm', 'insurance', 'finance', 'loan', 'investment',
      'construction', 'contractor', 'developer', 'estate', 'property'
    ];

    // Expanded list of tourist keywords
    const touristKeywords = [
      // Religious and spiritual
      'temple', 'mandir', 'church', 'mosque', 'masjid', 'dargah',
      'shrine', 'monastery', 'ashram', 'math',

      // Historical
      'fort', 'palace', 'castle', 'ruins', 'ancient', 'historic',
      'heritage', 'archaeological', 'monument', 'memorial', 'tomb',
      'mausoleum', 'haveli',

      // Natural attractions
      'beach', 'sea', 'lake', 'river', 'waterfall', 'falls',
      'mountain', 'hill', 'peak', 'valley', 'cave', 'garden',
      'park', 'sanctuary', 'national park', 'wildlife', 'forest',
      'nature', 'botanical', 'zoo', 'aquarium',

      // Cultural
      'museum', 'gallery', 'art', 'culture', 'heritage', 'statue',
      'sculpture', 'landmark', 'point of interest', 'viewpoint',
      'observation', 'lookout',

      // Entertainment
      'amusement park', 'water park', 'theme park', 'entertainment',
      'recreation', 'adventure', 'safari',

      // Tourism specific
      'tourist', 'tourism', 'sightseeing', 'attraction', 'destination',
      'heritage site', 'world heritage'
    ];

    const searchTypes = [
      'tourist_attraction',
      'natural_feature',
      'point_of_interest',
      'establishment',
      'park',
      'museum',
      'place_of_worship',
      'landmark'
    ];

    let allPlaces = [];

    for (const type of searchTypes) {
      if (allPlaces.length >= 20) break;

      const request = {
        location: locationLatLng,
        radius: 5000,
        type: type,
        language: 'en'
      };

      try {
        const results = await new Promise((resolve, reject) => {
          setTimeout(() => {
            service.nearbySearch(request, (results, status) => {
              console.log(`Search status for ${type}:`, status);
              if (status === 'OK') {
                resolve(results);
              } else if (status === 'ZERO_RESULTS') {
                resolve([]);
              } else {
                console.warn(`Search failed for type ${type} with status: ${status}`);
                resolve([]);
              }
            });
          }, 200);
        });

        if (results && results.length > 0) {
          const filteredResults = results.filter(place => {
            const name = place.name.toLowerCase();
            const types = place.types.map(t => t.toLowerCase());
            
            // Check for exclude keywords in name
            const hasExcludeWord = excludeKeywords.some(keyword => 
              name.includes(keyword.toLowerCase())
            );
            if (hasExcludeWord) return false;

            // Check for business-related types
            const hasBusinessType = types.some(t => [
              'store',
              'doctor',
              'health',
              'lodging',
              'restaurant',
              'food',
              'car_dealer',
              'car_repair',
              'car_rental',
              'travel_agency',
              'real_estate_agency',
              'insurance_agency',
              'local_government_office',
              'lawyer',
              'accounting',
              'finance',
              'bank',
              'school'
            ].includes(t));
            if (hasBusinessType) return false;

            // Must have either a tourist keyword or be a tourist type
            const hasTouristKeyword = touristKeywords.some(keyword => 
              name.includes(keyword.toLowerCase())
            );
            
            const hasTouristType = types.some(t => [
              'tourist_attraction',
              'museum',
              'art_gallery',
              'aquarium',
              'amusement_park',
              'park',
              'natural_feature',
              'place_of_worship',
              'landmark'
            ].includes(t));

            return hasTouristKeyword || hasTouristType;
          });

          allPlaces = [...allPlaces, ...filteredResults];
          console.log(`Found ${filteredResults.length} tourist places of type ${type}`);
        }
      } catch (error) {
        console.warn(`Error searching for type ${type}:`, error);
        continue;
      }
    }

    document.body.removeChild(mapDiv);

    if (allPlaces.length === 0) {
      console.log('No tourist places found after filtering');
      return [];
    }

    const uniquePlaces = Array.from(
      new Map(allPlaces.map(place => [place.place_id, place])).values()
    );

    const sortedPlaces = uniquePlaces
      .sort((a, b) => {
        // Prioritize places with photos
        if (a.photos && !b.photos) return -1;
        if (!a.photos && b.photos) return 1;
        
        // Then sort by rating
        const ratingDiff = (b.rating || 0) - (a.rating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        
        // If ratings are equal, sort by number of ratings
        return (b.user_ratings_total || 0) - (a.user_ratings_total || 0);
      })
      .slice(0, 20);

    console.log(`Returning ${sortedPlaces.length} filtered tourist places`);
    return sortedPlaces;

  } catch (error) {
    console.error('Error in fetchNearbyAttractions:', error);
    throw error;
  }
}

function createAttractionCard(place) {
  const card = document.createElement('div');
  card.className = 'attraction-card';
  
  // Default image path
  const defaultImagePath = '/images/placeholder-attraction.jpg';
  
  // Try to get the best photo URL with error handling
  let photoUrl = defaultImagePath;
  try {
    if (place.photos && place.photos.length > 0) {
      // Sort photos by width to get landscape/banner-style images
      const sortedPhotos = [...place.photos].sort((a, b) => {
        // Get photo metadata
        const aWidth = a.width || 0;
        const aHeight = a.height || 0;
        const bWidth = b.width || 0;
        const bHeight = b.height || 0;

        // Calculate aspect ratios (width/height)
        const aRatio = aWidth / aHeight;
        const bRatio = bWidth / bHeight;

        // Prefer landscape photos (ratio > 1) and photos closer to 16:9 ratio
        const idealRatio = 16/9;
        const aDiff = Math.abs(aRatio - idealRatio);
        const bDiff = Math.abs(bRatio - idealRatio);

        return aDiff - bDiff;
      });

      // Try to get a good landscape photo
      const bestPhoto = sortedPhotos[0];
      photoUrl = bestPhoto.getUrl({
        maxWidth: 400,  // Increased size for better quality
        maxHeight: 300  // Maintain 4:3 aspect ratio minimum
      });

      // Fallback to first photo if something goes wrong
      if (!photoUrl) {
        photoUrl = place.photos[0].getUrl({
          maxWidth: 400,
          maxHeight: 300
        });
      }
    }
  } catch (error) {
    console.warn('Failed to get photo URL for place:', place.name, error);
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
      ${place.rating ? `
        <div class="rating-badge">
          <span class="rating-number">${place.rating.toFixed(1)}</span>
          <span class="rating-star">★</span>
        </div>
      ` : ''}
    </div>
    <div class="attraction-details">
      <h3>${place.name}</h3>
      <div class="rating">
        ${place.rating ? `
          <span class="stars" title="${place.rating} out of 5 stars">${ratingStars}</span>
          <span class="rating-text">(${place.user_ratings_total || 0} reviews)</span>
        ` : '<span class="no-rating">No ratings yet</span>'}
      </div>
      ${place.vicinity ? `<p class="vicinity">${place.vicinity}</p>` : ''}
    </div>
  `;

  // Add hover effect for image gallery if multiple photos exist
  if (place.photos && place.photos.length > 1) {
    const imageContainer = card.querySelector('.attraction-image-container');
    let currentPhotoIndex = 0;
    
    imageContainer.addEventListener('mouseenter', () => {
      const interval = setInterval(() => {
        currentPhotoIndex = (currentPhotoIndex + 1) % place.photos.length;
        try {
          const nextPhotoUrl = place.photos[currentPhotoIndex].getUrl({
            maxWidth: 400,
            maxHeight: 300
          });
          const img = imageContainer.querySelector('img');
          img.src = nextPhotoUrl;
        } catch (error) {
          console.warn('Failed to cycle photo:', error);
        }
      }, 2000); // Change photo every 2 seconds
      
      imageContainer.dataset.interval = interval;
    });

    imageContainer.addEventListener('mouseleave', () => {
      clearInterval(Number(imageContainer.dataset.interval));
      // Reset to best photo
      const img = imageContainer.querySelector('img');
      img.src = photoUrl;
    });
  }

  card.addEventListener('click', () => {
    const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${place.place_id}`;
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  });

  return card;
}

async function displayNearbyAttractions(location) {
  if (!location) {
    console.error('No location provided to displayNearbyAttractions');
    return;
  }

  console.log('Starting to display nearby attractions for:', location);

  try {
    // Create container for attractions section if it doesn't exist
    let attractionsSection = document.querySelector('.attractions-section');
    if (!attractionsSection) {
      attractionsSection = document.createElement('div');
      attractionsSection.className = 'attractions-section';
      const timelineContainer = document.querySelector('.timeline-container');
      if (!timelineContainer) {
        console.error('Timeline container not found');
        return;
      }
      timelineContainer.insertAdjacentElement('afterend', attractionsSection);
    }

    // Show loading state
    attractionsSection.innerHTML = `
      <h2>Popular Attractions Nearby</h2>
      <div class="attractions-container">
        <div class="attractions-scroll">
          <div class="loading-spinner">Loading attractions...</div>
        </div>
      </div>
    `;

    // Fetch attractions
    console.log('Fetching attractions...');
    const attractions = await fetchNearbyAttractions(location);
    console.log('Fetched attractions:', attractions);

    const scrollContainer = attractionsSection.querySelector('.attractions-scroll');

    if (!attractions || attractions.length === 0) {
      scrollContainer.innerHTML = `
        <div class="no-attractions">
          <p>No attractions found for this location.</p>
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
    console.error('Error in displayNearbyAttractions:', error);
    const attractionsSection = document.querySelector('.attractions-section');
    if (attractionsSection) {
      attractionsSection.innerHTML = `
        <h2>Popular Attractions Nearby</h2>
        <div class="error-message">
          <p>Unable to load attractions: ${error.message}</p>
          <p>You can still explore the area on 
            <a href="https://www.google.com/maps/search/attractions+in+${encodeURIComponent(location)}" 
               target="_blank" rel="noopener noreferrer">Google Maps</a>
          </p>
        </div>
      `;
    }
  }
}

async function fetchNearbyHotels(location) {
  try {
    await waitForGoogleMaps();

    const mapDiv = document.createElement('div');
    mapDiv.style.display = 'none';
    document.body.appendChild(mapDiv);

    const map = new google.maps.Map(mapDiv, {
      center: { lat: 0, lng: 0 },
      zoom: 1
    });

    const service = new google.maps.places.PlacesService(map);
    const geocoder = new google.maps.Geocoder();

    const geocodeResult = await new Promise((resolve, reject) => {
      geocoder.geocode({ address: location }, (results, status) => {
        if (status === 'OK') {
          resolve(results[0].geometry.location);
        } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });

    const locationLatLng = {
      lat: geocodeResult.lat(),
      lng: geocodeResult.lng()
    };

    // Search for hotels within 25km radius
    const request = {
      location: locationLatLng,
      radius: 25000, // 25km in meters
      type: 'lodging',
      language: 'en'
    };

    const results = await new Promise((resolve, reject) => {
      service.nearbySearch(request, (results, status) => {
        if (status === 'OK') {
          resolve(results);
        } else if (status === 'ZERO_RESULTS') {
          resolve([]);
        } else {
          reject(new Error(`Hotel search failed: ${status}`));
        }
      });
    });

    document.body.removeChild(mapDiv);

    // Filter and sort hotels
    const sortedHotels = results
      .filter(hotel => {
        // Filter out places that aren't actually hotels
        const types = hotel.types.map(t => t.toLowerCase());
        return types.includes('lodging') && 
               !types.includes('rv_park') && 
               !types.includes('campground');
      })
      .sort((a, b) => {
        // Sort by rating and number of reviews
        const ratingDiff = (b.rating || 0) - (a.rating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        return (b.user_ratings_total || 0) - (a.user_ratings_total || 0);
      })
      .slice(0, 15); // Limit to top 15 hotels

    return sortedHotels;

  } catch (error) {
    console.error('Error in fetchNearbyHotels:', error);
    throw error;
  }
}

function createHotelCard(hotel) {
  const card = document.createElement('div');
  card.className = 'hotel-card';
  
  // Default image path
  const defaultImagePath = '/images/placeholder-hotel.jpg';
  
  // Get hotel photo URL
  let photoUrl = defaultImagePath;
  try {
    if (hotel.photos && hotel.photos.length > 0) {
      photoUrl = hotel.photos[0].getUrl({
        maxWidth: 400,
        maxHeight: 300
      });
    }
  } catch (error) {
    console.warn('Failed to get hotel photo:', error);
  }

  const ratingStars = hotel.rating 
    ? '★'.repeat(Math.floor(hotel.rating)) + '☆'.repeat(5 - Math.floor(hotel.rating))
    : '';

  // Calculate price level display
  const priceLevel = hotel.price_level 
    ? '💰'.repeat(hotel.price_level)
    : 'Price not available';

  card.innerHTML = `
    <div class="hotel-image-container">
      <img 
        src="${photoUrl}" 
        alt="${hotel.name}"
        class="hotel-image"
        onerror="this.onerror=null; this.src='${defaultImagePath}'"
      >
      ${hotel.rating ? `
        <div class="rating-badge">
          <span class="rating-number">${hotel.rating.toFixed(1)}</span>
          <span class="rating-star">★</span>
        </div>
      ` : ''}
    </div>
    <div class="hotel-details">
      <h3>${hotel.name}</h3>
      <div class="price-level">${priceLevel}</div>
      <div class="rating">
        ${hotel.rating ? `
          <span class="stars">${ratingStars}</span>
          <span class="rating-text">(${hotel.user_ratings_total || 0} reviews)</span>
        ` : '<span class="no-rating">No ratings yet</span>'}
      </div>
      ${hotel.vicinity ? `<p class="vicinity">${hotel.vicinity}</p>` : ''}
    </div>
  `;

  // Add click handler to open in Google Maps
  card.addEventListener('click', () => {
    const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${hotel.place_id}`;
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  });

  return card;
}

async function displayNearbyHotels(location) {
  if (!location) {
    console.error('No location provided to displayNearbyHotels');
    return;
  }

  try {
    // Create hotels section
    let hotelsSection = document.querySelector('.hotels-section');
    if (!hotelsSection) {
      hotelsSection = document.createElement('div');
      hotelsSection.className = 'hotels-section';
      const attractionsSection = document.querySelector('.attractions-section');
      if (attractionsSection) {
        attractionsSection.insertAdjacentElement('afterend', hotelsSection);
      }
    }

    // Show loading state
    hotelsSection.innerHTML = `
      <h2>Best Hotels Nearby</h2>
      <p class="section-subtitle">Within 25km radius</p>
      <div class="hotels-container">
        <div class="hotels-scroll">
          <div class="loading-spinner">Loading hotels...</div>
        </div>
      </div>
    `;

    // Fetch hotels
    const hotels = await fetchNearbyHotels(location);
    const scrollContainer = hotelsSection.querySelector('.hotels-scroll');

    if (!hotels || hotels.length === 0) {
      scrollContainer.innerHTML = `
        <div class="no-hotels">
          <p>No hotels found in this area.</p>
          <p>You can still search for accommodations on 
            <a href="https://www.google.com/maps/search/hotels+in+${encodeURIComponent(location)}" 
               target="_blank" rel="noopener noreferrer">Google Maps</a>
          </p>
        </div>
      `;
      return;
    }

    // Display hotels
    scrollContainer.innerHTML = '';
    hotels.forEach(hotel => {
      const card = createHotelCard(hotel);
      scrollContainer.appendChild(card);
    });

  } catch (error) {
    console.error('Error in displayNearbyHotels:', error);
    const hotelsSection = document.querySelector('.hotels-section');
    if (hotelsSection) {
      hotelsSection.innerHTML = `
        <h2>Best Hotels Nearby</h2>
        <div class="error-message">
          <p>Unable to load hotels: ${error.message}</p>
          <p>You can still search for accommodations on 
            <a href="https://www.google.com/maps/search/hotels+in+${encodeURIComponent(location)}" 
               target="_blank" rel="noopener noreferrer">Google Maps</a>
          </p>
        </div>
      `;
    }
  }
}

// Make sure initMap is defined and globally accessible
window.initMap = function() {
  console.log('initMap called');
  window.googleMapsLoaded = true;
};

// Initialize the page when authentication state changes
onAuthStateChanged(auth, user => {
if (!user) {
  window.location.href = 'login.html';
} else {
  loadTripDetails();
}
});


// Add this at the beginning of your DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', async () => {
  // Create back button
  
  const backButton = document.createElement('button');
  backButton.className = 'back-button';
  backButton.innerHTML = '<i class="fas fa-arrow-left"></i> Back';
  backButton.addEventListener('click', () => {
    window.history.back();
  });

  // Find or create a suitable container for the back button
  let container = document.querySelector('header');
  if (!container) {
    // If no header exists, create a new container div
    container = document.createElement('div');
    container.className = 'navigation-container';
    // Insert at the very beginning of the body
    document.body.insertBefore(container, document.body.firstChild);
  }
  
  // Insert the back button as the first child of the container
  container.insertBefore(backButton, container.firstChild);

  // Rest of the code...
  const modal = document.getElementById('reportModal');
  const reportButton = document.getElementById('reportButton');
  const closeButton = document.querySelector('.close-button');
  const cancelButton = document.querySelector('.cancel-button');
  const reportForm = document.getElementById('reportForm');

  // Open modal
  reportButton.addEventListener('click', () => {
    modal.style.display = 'block';
  });

  // Close modal functions
  function closeModal() {
    modal.style.display = 'none';
    reportForm.reset();
  }

  closeButton.addEventListener('click', closeModal);
  cancelButton.addEventListener('click', closeModal);

  // Close modal when clicking outside
  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  // Handle form submission
  reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const reason = document.getElementById('reportReason').value;
    const details = document.getElementById('reportDetails').value;
    
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`/trips/${tripId}/report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason,
          details,
          reportedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        // Create and show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.textContent = 'Thank you for your report. We will review it shortly.';
        
        const modalBody = document.querySelector('.modal-body');
        modalBody.innerHTML = '';
        modalBody.appendChild(successMessage);
        
        // Close modal after 2 seconds
        setTimeout(closeModal, 2000);
      } else {
        throw new Error('Failed to submit report');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please try again later.');
    }
  });
});

function showErrorMessage(message, container) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.style.color = 'red';
  errorDiv.style.padding = '10px';
  errorDiv.style.marginTop = '10px';
  errorDiv.textContent = message;
  container.appendChild(errorDiv);

  // Remove error message after 5 seconds
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

function showSuccessMessage(message, container) {
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.style.color = 'green';
  successDiv.style.padding = '10px';
  successDiv.style.marginTop = '10px';
  successDiv.textContent = message;
  container.appendChild(successDiv);

  // Remove success message after 3 seconds
  setTimeout(() => {
    successDiv.remove();
  }, 3000);
}

// Update the report form submission handler
reportForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Clear any existing error messages
  const existingErrors = document.querySelectorAll('.error-message');
  existingErrors.forEach(error => error.remove());
  
  const submitButton = reportForm.querySelector('button[type="submit"]');
  const originalButtonText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = 'Submitting...';
  
  const reason = document.getElementById('reportReason').value;
  const details = document.getElementById('reportDetails').value;
  
  try {
    // Validate inputs
    if (!reason) {
      throw new Error('Please select a reason for reporting');
    }
    if (!details || details.trim().length < 10) {
      throw new Error('Please provide more details about the issue (minimum 10 characters)');
    }

    const token = await auth.currentUser.getIdToken();
    const response = await fetch(`http://localhost:3000/trips/${tripId}/report`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason,
        details,
        reportedAt: new Date().toISOString()
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to submit report');
    }

    // Show success message and reset form
    const modalBody = document.querySelector('.modal-body');
    showSuccessMessage('Thank you for your report. We will review it shortly.', modalBody);
    reportForm.reset();

    // Close modal after delay
    setTimeout(() => {
      modal.style.display = 'none';
    }, 2000);

  } catch (error) {
    console.error('Error submitting report:', error);
    const modalBody = document.querySelector('.modal-body');
    showErrorMessage(error.message || 'Failed to submit report. Please try again later.', modalBody);
  } finally {
    // Re-enable submit button
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
  }
});

// Add validation feedback as user types
document.getElementById('reportDetails').addEventListener('input', (e) => {
  const details = e.target.value;
  const minLength = 10;
  const remainingChars = minLength - details.trim().length;
  
  const feedbackEl = e.target.nextElementSibling || document.createElement('div');
  feedbackEl.className = 'input-feedback';
  
  if (!e.target.nextElementSibling) {
    e.target.parentNode.appendChild(feedbackEl);
  }
  
  if (remainingChars > 0) {
    feedbackEl.textContent = `Please add ${remainingChars} more character${remainingChars === 1 ? '' : 's'}`;
    feedbackEl.style.color = 'orange';
  } else {
    feedbackEl.textContent = '✓ Length requirement met';
    feedbackEl.style.color = 'green';
  }
});

async function loadUserProfile(userId) {
  try {
    const token = await auth.currentUser.getIdToken();
    const url = `/users/${userId}/profile`;
    
    console.log(`Fetching user profile from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    console.log("Fetching profile for userId:", userId);
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries([...response.headers.entries()]));
    
    const contentType = response.headers.get('content-type');
    console.log('Content-Type:', contentType);
    
    if (!response.ok) {
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed with status: ${response.status}`);
      } else {
        // For HTML responses, just log the first 100 characters to see what's coming back
        const text = await response.text();
        console.error('Received HTML instead of JSON:', text.substring(0, 100) + '...');
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
    }
    
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Received non-JSON response:', text.substring(0, 100) + '...');
      throw new Error('Server did not return JSON');
    }
    
    const data = await response.json();
    console.log('Successfully loaded profile data:', data);
    return data;
  } catch (error) {
    console.error('Error loading user profile:', error);
    throw error;
  }
}

async function fetchUserTrips(userId) {
  try {
    const token = await auth.currentUser.getIdToken();
    const response = await fetch(`/trips/user/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error('Failed to fetch user trips');
    return await response.json();
  } catch (error) {
    console.error('Error loading user trips:', error);
    throw error;
  }
}

function createUserProfileModal() {
  // Check if modal already exists
  if (document.getElementById('userProfileModal')) {
    return;
  }

  const modalHTML = `
    <div id="userProfileModal" class="profile-modal">
      <div class="modal-content profile-modal-content">
        <span class="close-button">&times;</span>
        <div class="user-profile-header">
          <img id="modal-user-photo" class="modal-user-photo" src="/images/default-profile.jpg" alt="Profile Photo">
          <h2 id="modal-user-name">Loading...</h2>
        </div>
        <div class="user-profile-details">
          <p id="modal-user-bio" class="user-bio">Loading bio...</p>
          <div class="user-stats">
            <div class="stat">
              <span class="stat-value" id="modal-trip-count">-</span>
              <span class="stat-label">Trips</span>
            </div>
            <div class="stat">
              <span class="stat-value" id="modal-joined-date">-</span>
              <span class="stat-label">Joined</span>
            </div>
            <div class="stat">
              <span class="stat-value" id="modal-user-likes">-</span>
              <span class="stat-label">Likes</span>
            </div>
          </div>
        </div>
        
        <h3>Recent Trips</h3>
        <div id="user-trips-container" class="user-trips-container">
          <div class="loading-spinner">Loading trips...</div>
        </div>
      </div>
    </div>
  `;

  // Append modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Add event listener to close button
  const modal = document.getElementById('userProfileModal');
  const closeButton = modal.querySelector('.close-button');
  
  closeButton.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // Close when clicking outside the modal
  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });

  // Add CSS for the modal
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .profile-modal-content {
      max-width: 600px;
      padding: 30px;
      border-radius: 12px;
    }
    
    .user-profile-header {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .modal-user-photo {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      object-fit: cover;
      margin-right: 20px;
      border: 3px solid #3498db;
    }
    
    .user-bio {
      font-style: italic;
      color: #555;
      margin-bottom: 20px;
      line-height: 1.5;
    }
    
    .user-stats {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      padding: 15px;
      background: #f5f8fa;
      border-radius: 8px;
    }
    
    .stat {
      text-align: center;
      flex: 1;
    }
    
    .stat-value {
      display: block;
      font-size: 1.5rem;
      font-weight: bold;
      color: #2c3e50;
    }
    
    .stat-label {
      font-size: 0.9rem;
      color: #7f8c8d;
    }
    
   .user-trips-container {
  display: flex; /* Align trips in a row */
  flex-wrap: nowrap; /* Prevent wrapping */
  gap: 16px; /* Space between trips */
  overflow-x: auto; /* Enable horizontal scrolling */
  overflow-y: hidden; /* Hide vertical scrolling */
  white-space: nowrap; /* Prevent line breaks */
  padding-bottom: 10px; /* Prevent cut-off */
  max-width: 100%; /* Fit within modal */
  scrollbar-width: thin; /* Firefox scrollbar */
  scrollbar-color: #aaa transparent;
}

/* Make trip cards stay the same width */
.user-trip-card {
  flex: 0 0 auto; /* Prevent stretching */
  min-width: 250px;
  max-width: 300px;
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

/* Scrollbar Styling for WebKit Browsers */
.user-trips-container::-webkit-scrollbar {
  height: 6px; /* Thin horizontal scrollbar */
}

.user-trips-container::-webkit-scrollbar-thumb {
  background: #bbb;
  border-radius: 4px;
}

.user-trips-container::-webkit-scrollbar-thumb:hover {
  background: #999;
}
    
    .user-trip-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    
    .user-trip-image {
      width: 100%;
      height: 150px;
      object-fit: cover;
    }
    
    .user-trip-details {
      padding: 15px;
    }
    
    .user-trip-title {
      font-weight: bold;
      margin: 0 0 10px 0;
      font-size: 1.1em;
    }
    
    .user-trip-dates {
      font-size: 0.9em;
      color: #666;
      margin-bottom: 10px;
    }
    
    .user-trip-stats {
      display: flex;
      justify-content: space-between;
      font-size: 0.8em;
      color: #888;
    }
  `;
  
  document.head.appendChild(styleElement);
}

async function showUserProfileModal(userId, username, photoURL) {
  // Create modal if it doesn't exist
  createUserProfileModal();
  
  const modal = document.getElementById('userProfileModal');
  const modalUserPhoto = document.getElementById('modal-user-photo');
  const modalUserName = document.getElementById('modal-user-name');
  const modalUserBio = document.getElementById('modal-user-bio');
  const modalTripCount = document.getElementById('modal-trip-count');
  const modalJoinedDate = document.getElementById('modal-joined-date');
  const modalUserLikes = document.getElementById('modal-user-likes');
  const userTripsContainer = document.getElementById('user-trips-container');
  
  // Set initial values
  modalUserName.textContent = username || 'Loading...';
  if (photoURL) {
    modalUserPhoto.src = photoURL;
    modalUserPhoto.onerror = function() {
      this.onerror = null;
      this.src = '/images/default-profile.jpg';
    };
  } else {
    modalUserPhoto.src = '/images/default-profile.jpg';
  }
  
  modalUserBio.textContent = 'Loading bio...';
  modalTripCount.textContent = '-';
  modalJoinedDate.textContent = '-';
  modalUserLikes.textContent = '-';
  userTripsContainer.innerHTML = '<div class="loading-spinner">Loading trips...</div>';
  
  // Show the modal
  modal.style.display = 'block';
  
  try {
    // Fetch user profile data
    const userProfile = await loadUserProfile(userId);
    
    // Update profile info
    modalUserName.textContent = userProfile.displayName || username || 'Anonymous User';
    modalUserBio.textContent = userProfile.bio || 'No bio available';
    
    // Format and display joined date
    if (userProfile.createdAt) {
      const joinDate = new Date(userProfile.createdAt);
      modalJoinedDate.textContent = joinDate.toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      });
    }
    
    modalUserLikes.textContent = userProfile.totalLikes || 0;
    
    // Fetch user trips
    const trips = await fetchUserTrips(userId);
    modalTripCount.textContent = trips.length;
    
    // Display trips
    if (trips.length === 0) {
      userTripsContainer.innerHTML = '<p class="no-trips">This user hasn\'t posted any trips yet.</p>';
    } else {
      userTripsContainer.innerHTML = '';
      
      // Sort trips by date (newest first)
      trips.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      trips.forEach(trip => {
        const tripCard = document.createElement('div');
        tripCard.className = 'user-trip-card';
        
        const defaultTripImage = '/images/default-trip-banner.jpg';
        const tripImage = trip.bannerPhoto || (trip.mediaUrls && trip.mediaUrls.length > 0 ? trip.mediaUrls[0] : defaultTripImage);
        
        tripCard.innerHTML = `
          <img src="${tripImage}" alt="${trip.title}" class="user-trip-image" 
               onerror="this.onerror=null; this.src='${defaultTripImage}'">
          <div class="user-trip-details">
            <h4 class="user-trip-title">${trip.title || 'Untitled Trip'}</h4>
            <div class="user-trip-dates">${trip.days || 0} days${trip.start && trip.end ? ` • ${trip.start} to ${trip.end}` : ''}</div>
            <div class="user-trip-stats">
              <span><i class="far fa-heart"></i> ${trip.likes || 0}</span>
              <span><i class="far fa-eye"></i> ${trip.views || 0}</span>
            </div>
          </div>
        `;
        
        // Make the card clickable
        tripCard.addEventListener('click', () => {
          window.location.href = `trip-details.html?id=${trip.id}`;
        });
        
        userTripsContainer.appendChild(tripCard);
      });
    }
    
  } catch (error) {
    console.error('Error displaying user profile:', error);
    modalUserBio.textContent = 'Error loading user profile.';
    userTripsContainer.innerHTML = '<p class="error-message">Failed to load trips. Please try again later.</p>';
  }
}
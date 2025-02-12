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
  // Add back button to the page
  const header = document.querySelector('header') || document.body.firstChild;
  const backButton = document.createElement('button');
  backButton.className = 'back-button';
  backButton.innerHTML = '<i class="fas fa-arrow-left"></i> Back';
  backButton.addEventListener('click', () => {
    window.history.back();
  });
  header.insertAdjacentElement('afterbegin', backButton);

});
          
          
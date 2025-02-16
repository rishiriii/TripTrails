// Import Firebase auth if needed
import { auth } from '../firebase.js';
import { db } from '../firebase.js';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { initTopTripsBanner } from './top-trip-banner.js';

const WEATHER_API_KEY = '215f465dceb641daa0e75031251801';
const GOOGLE_SEARCH_API_KEY = 'AIzaSyAKcLJxLqRDDLVI4y6RUuoYsRTSZtkw1UM';
const GOOGLE_CX = 'a19696864f287430b';
const TRAVEL_API_KEY = '8952606821mshc09726990f15f29p168cf5jsn1ef8762235c';

async function fetchGoogleImage(query) {
  try {
      const response = await fetch(
          `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&cx=${GOOGLE_CX}&searchType=image&num=1&key=${GOOGLE_SEARCH_API_KEY}`
      );
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
          return data.items[0].link; // First image result
      }
      return '/api/placeholder/400/250'; // Fallback image if no result
  } catch (error) {
      console.error('Google Image Fetch Error:', error);
      return '/api/placeholder/400/250';
  }
}

async function fetchBestTimeToVisit(cityName) {
  try {
      const response = await fetch(
          `https://travel-advisor.p.rapidapi.com/locations/search?query=${encodeURIComponent(cityName)}`,
          {
              method: 'GET',
              headers: {
                  'X-RapidAPI-Key': TRAVEL_API_KEY,
                  'X-RapidAPI-Host': 'travel-advisor.p.rapidapi.com'
              }
          }
      );
      
      const data = await response.json();
      
      // Basic logic to determine best time based on climate data
      // You might want to adjust this logic based on the actual data structure
      if (data.data && data.data[0] && data.data[0].climate) {
          return data.data[0].climate.best_time || 'Information not available';
      }
      
      // Fallback to basic seasonal logic if API doesn't return climate data
      return determineBasicBestTime(cityName);
  } catch (error) {
      console.error('Error fetching best time to visit:', error);
      return determineBasicBestTime(cityName);
  }
}

async function getAuthToken() {
  try {
    await new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe();
        resolve(user);
      });
    });
    
    const user = auth.currentUser;
    return user.getIdToken();
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}


async function fetchTopDestinations() {
  try {
      const q = query(
          collection(db, 'destinations'),
          orderBy('tripCount', 'desc'),
          limit(5)
      );

      const querySnapshot = await getDocs(q);
      const destinations = [];

      for (const doc of querySnapshot.docs) {
          const destination = { id: doc.id, ...doc.data() };

          // Always fetch Google Image for the destination
          destination.imageUrl = await fetchGoogleImage(destination.name);

          // Fetch weather data
          destination.weather = await getWeatherData(destination.name);
          destinations.push(destination);
      }

      displayTopDestinations(destinations);
  } catch (error) {
      console.error('Error fetching destinations:', error);
      document.getElementById('top-destinations').innerHTML = 
          '<p class="error">Failed to load destinations</p>';
  }
}

async function getWeatherData(city) {
  try {
      const response = await fetch(
          `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(city)}&aqi=no`
      );
      const data = await response.json();
      return {
          temp: data.current.temp_c,
          condition: data.current.condition.text,
      };
  } catch (error) {
      console.error('Weather fetch error:', error);
      return null;
  }
}

function displayTopDestinations(destinations) {
  const container = document.getElementById('top-destinations');
  container.innerHTML = ''; // Clear previous content

  if (!destinations.length) {
      container.innerHTML = '<p>No destinations found</p>';
      return;
  }

  // Function to format trip count to nearest 10+
  const formatTripCount = (count) => {
      if (count <= 10) return "10+ trips";
      const roundedDown = Math.floor(count / 10) * 10;
      return `${roundedDown}+ trips`;
  };

  destinations.forEach((dest, index) => {
      const card = document.createElement('div');
      card.className = `destination-card animate-on-scroll ${index < 3 ? 'top-three' : ''}`;
      card.onclick = () => window.location.href = `/explore.html?destination=${encodeURIComponent(dest.name)}`;

      card.innerHTML = `
          <img class="destination-image" src="${dest.imageUrl}" alt="${dest.name}">
          <div class="destination-overlay">${formatTripCount(dest.tripCount)}</div>
          <div class="destination-content">
              <h3 class="destination-name">${dest.name}</h3>
              <div class="weather-section">
                  <div class="weather-item">
                      <div class="weather-label">Temperature</div>
                      <div class="weather-value">${dest.weather ? dest.weather.temp + '°C' : 'N/A'}</div>
                  </div>
                  <div class="weather-item">
                      <div class="weather-label">Condition</div>
                      <div class="weather-value">${dest.weather ? dest.weather.condition : 'N/A'}</div>
                  </div>
              </div>
          </div>
      `;
      
      container.appendChild(card);
  });

  animateOnScroll(); // Ensures animations trigger after adding content
}


// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const targetId = this.getAttribute("href");
    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: "smooth"
      });
    }
  });
});

// Mobile menu functionality
function initializeMobileMenu() {
  const menuToggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelector(".nav-links");
  
  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      menuToggle.classList.toggle("active");
      navLinks.classList.toggle("active");
    });
  }
}

// Scroll animations
function animateOnScroll() {
  const elements = document.querySelectorAll(".animate-on-scroll");
  elements.forEach((el) => {
    const rect = el.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top <= windowHeight * 0.75) {
      el.classList.add("in-view");
    }
  });
}

// Combined scroll handler
function handleScroll() {
  const header = document.querySelector('.header');
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
  animateOnScroll();
}

// Initialize everything when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  fetchTopDestinations();
  initializeMobileMenu();
  animateOnScroll();
});

// Add scroll event listener
window.addEventListener('scroll', handleScroll);
initTopTripsBanner();


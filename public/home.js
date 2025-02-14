// Import Firebase auth if needed
import { auth } from '../firebase.js';
import { db } from '../firebase.js';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

const WEATHER_API_KEY = '215f465dceb641daa0e75031251801';

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
      const destination = {
        id: doc.id,
        ...doc.data()
      };
      const weatherData = await getWeatherData(destination.name);
      destination.weather = weatherData;
      destinations.push(destination);
    }

    displayTopDestinations(destinations);
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('top-destinations').innerHTML = 
      '<p class="error">Failed to load destinations</p>';
  }
}

function displayTopDestinations(destinations) {
  const container = document.getElementById('top-destinations');
  
  if (!destinations.length) {
    container.innerHTML = '<p>No destinations found</p>';
    return;
  }

  container.innerHTML = destinations
    .map((dest, index) => `
      <div class="destination-card animate-on-scroll ${index < 3 ? 'top-three' : ''}" 
           onclick="window.location.href='/explore.html?destination=${encodeURIComponent(dest.name)}'">
        <div class="rank">#${index + 1}</div>
        <h3>${dest.name}</h3>
        <div class="trip-count">
          <i class="fas fa-map-marker-alt"></i>
          <span>${dest.tripCount} trips</span>
        </div>
        ${dest.weather ? `
          <div class="weather">
            <span>${dest.weather.temp}°C</span>
            <span>${dest.weather.condition}</span>
          </div>
        ` : ''}
      </div>
    `).join('');

  // Trigger animation check after adding new elements
  animateOnScroll();
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
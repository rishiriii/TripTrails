// Import Firebase auth if needed
import { auth } from '../firebase.js';
import { db } from '../firebase.js';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

const WEATHER_API_KEY = '215f465dceb641daa0e75031251801';

async function getAuthToken() {
  try {
    // Wait for auth initialization
    await new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe(); // Unsubscribe after first state change
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
    // Query Firestore for top 5 destinations
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
      <div class="destination-card ${index < 3 ? 'top-three' : ''}" 
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
}

// Initialize once when page loads
document.addEventListener('DOMContentLoaded', fetchTopDestinations);
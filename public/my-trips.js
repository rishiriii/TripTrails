import { auth } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';

class TripManager {
  constructor() {
    this.tripListElement = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    
    this.tripListElement = document.getElementById('my-trip-list');
    if (!this.tripListElement) {
      console.error('Trip list element not found');
      return;
    }

    this.initialized = true;
    this.setupAuthListener();
  }

  setupAuthListener() {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = 'login.html';
        return;
      }
      this.loadUserTrips();
    });
  }

  async loadUserTrips() {
    if (!this.tripListElement) {
      console.error('Trip list element not initialized');
      return;
    }

    // Show loading state
    this.tripListElement.innerHTML = '<p>Loading your trips...</p>';

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken(true);
      const response = await fetch('/trips', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user trips');
      }

      const trips = await response.json();
      
      // Clear existing content
      this.tripListElement.innerHTML = '';

      if (!trips || trips.length === 0) {
        this.tripListElement.innerHTML = '<p>No trips found. Create your first trip!</p>';
        return;
      }

      const userTrips = trips.filter(trip => trip.userId === user.uid);
      
      if (userTrips.length === 0) {
        this.tripListElement.innerHTML = '<p>No trips found. Create your first trip!</p>';
        return;
      }

      userTrips.forEach(trip => this.createTripCard(trip));
      this.addEventListeners();

    } catch (error) {
      console.error('Error loading user trips:', error);
      this.tripListElement.innerHTML = `
        <p>Failed to load your trips. Please try again later.</p>
        <button onclick="window.location.reload()" class="retry-button">Retry</button>
      `;
    }
  }

  createTripCard(trip) {
    const tripCard = document.createElement('div');
    tripCard.className = 'trip-card';
    tripCard.style.cursor = 'pointer'; // Add pointer cursor to indicate clickability
    tripCard.dataset.tripId = trip.id; // Add trip ID to the card element
    
    tripCard.innerHTML = `
      <div class="card-image">
        <img src="${trip.bannerPhoto || 'placeholder.jpg'}" 
             alt="Trip Banner" 
             style="width: 100%; height: 150px; object-fit: cover; border-radius: 10px;">
      </div>
      <div class="card-content">
        <h3>${trip.title || 'Untitled Trip'}</h3>
        <p>${trip.days || 0} Days / ${trip.nights || 0} Nights</p>
        <p>Cost: $${trip.expense || 0}</p>
        <div class="card-actions">
          <button class="edit-trip-btn" data-id="${trip.id}">Edit</button>
          <button class="delete-trip-btn" data-id="${trip.id}" 
                  data-banner="${trip.bannerPhoto || ''}">Delete</button>
        </div>
      </div>
    `;

    // Add click event listener for trip details navigation
    tripCard.addEventListener('click', (e) => {
      // Only navigate if the click wasn't on a button
      if (!e.target.closest('.card-actions')) {
        window.location.href = `trip-details.html?id=${trip.id}`;
      }
    });

    this.tripListElement.appendChild(tripCard);
  }

  addEventListeners() {
    this.addDeleteListeners();
    this.addEditListeners();
  }

  addDeleteListeners() {
    const deleteButtons = document.querySelectorAll('.delete-trip-btn');
    deleteButtons.forEach(button => {
      button.addEventListener('click', async (event) => {
        event.stopPropagation();
        event.preventDefault();

        const tripId = button.dataset.id;
        const bannerPhoto = button.dataset.banner;

        if (!tripId) {
          console.error('No trip ID found');
          return;
        }

        if (!confirm('Are you sure you want to delete this trip?')) {
          return;
        }

        try {
          const user = auth.currentUser;
          if (!user) {
            throw new Error('User not authenticated');
          }

          const token = await user.getIdToken(true);
          const response = await fetch(`/trips/${tripId}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ bannerPhoto }),
          });

          if (!response.ok) {
            throw new Error('Failed to delete trip');
          }

          alert('Trip deleted successfully');
          this.loadUserTrips(); // Refresh the list
        } catch (error) {
          console.error('Error deleting trip:', error);
          alert('Failed to delete trip. Please try again later.');
        }
      });
    });
  }

  addEditListeners() {
    const editButtons = document.querySelectorAll('.edit-trip-btn');
    editButtons.forEach(button => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        event.preventDefault();

        const tripId = button.dataset.id;
        if (!tripId) {
          console.error('No trip ID found');
          return;
        }

        window.location.href = `edit-trip.html?id=${tripId}`;
      });
    });
  }
}

// Initialize after DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  const tripManager = new TripManager();
  tripManager.init();
});
import { auth } from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';

const urlParams = new URLSearchParams(window.location.search);
const tripId = urlParams.get('id');

async function loadTrip(token) {
  try {
    const response = await fetch(`/trips/${tripId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const trip = await response.json();

    // Populate the form with trip details
    document.getElementById('title').value = trip.title || '';
    document.getElementById('start').value = trip.start || '';
    document.getElementById('end').value = trip.end || '';
    document.getElementById('days').value = trip.days || 0;
    document.getElementById('nights').value = trip.nights || 0;
    document.getElementById('expense').value = trip.expense || 0;
    document.getElementById('description').value = trip.description || '';
  } catch (error) {
    console.error('Error loading trip:', error.message);
    alert('Failed to load trip details. Please try again later.');
  }
}

async function saveChanges(event) {
  event.preventDefault();

  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const token = await user.getIdToken(true);
    
    const updatedTrip = {
      title: document.getElementById('title').value,
      start: document.getElementById('start').value,
      end: document.getElementById('end').value,
      days: parseInt(document.getElementById('days').value, 10),
      nights: parseInt(document.getElementById('nights').value, 10),
      expense: parseFloat(document.getElementById('expense').value),
      description: document.getElementById('description').value,
    };

    const response = await fetch(`/trips/${tripId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedTrip),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update trip');
    }

    alert('Trip updated successfully');
    window.location.href = 'my-trips.html';
  } catch (error) {
    console.error('Error updating trip:', error.message);
    alert('Failed to update trip. Please try again later.');
  }
}

// Initialize form and auth state monitoring
function initializeForm() {
  const form = document.getElementById('edit-trip-form');
  if (form) {
    form.addEventListener('submit', saveChanges);
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      alert('You must be logged in to edit trips.');
      window.location.href = 'login.html';
      return;
    }

    try {
      const token = await user.getIdToken(true);
      await loadTrip(token);
    } catch (error) {
      console.error('Error initializing form:', error);
      alert('Failed to load trip details. Please try again later.');
    }
  });
}

// Start initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeForm);
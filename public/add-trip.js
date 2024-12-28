import { auth } from '../firebase.js';
import { storage } from '../firebase.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const stops = [];

document.getElementById('add-stop-btn').addEventListener('click', () => {
 const stopInput = document.getElementById('stop-input');
 const stopValue = stopInput.value.trim();

 if (stopValue) {
   stops.push(stopValue);

   const stopListItem = document.createElement('div');
   stopListItem.textContent = stopValue;
   stopListItem.classList.add('stop-item');

   const deleteButton = document.createElement('button');
   deleteButton.textContent = 'Remove';
   deleteButton.addEventListener('click', () => {
     stops.splice(stops.indexOf(stopValue), 1);
     stopListItem.remove();
   });

   stopListItem.appendChild(deleteButton);
   document.getElementById('stops-container').appendChild(stopListItem);

   stopInput.value = '';
 }
});

document.getElementById('add-trip-form').addEventListener('submit', async (event) => {
 event.preventDefault();

 try {
   // Get current user and token
   const user = auth.currentUser;
   if (!user) {
     throw new Error('Please log in to add a trip');
   }
   const token = await user.getIdToken();

   const formData = new FormData(event.target);
   const newTrip = {
     start: formData.get('start'), // Start location
     end: formData.get('end'), // End location
     days: parseInt(formData.get('days')),
     nights: parseInt(formData.get('nights')),
     expense: parseFloat(formData.get('expense')),
     description: formData.get('description'),
     visibility: formData.get('visibility'),
     stops: stops,
     title: '', // Will be generated below
   };

   // Generate title from start and end locations
   newTrip.title = `${newTrip.start} to ${newTrip.end}`;

   // Validate required fields
   const requiredFields = ['start', 'end', 'days', 'nights', 'expense', 'description', 'visibility'];
   const missingFields = requiredFields.filter(field => !newTrip[field]);
   
   if (missingFields.length > 0) {
     throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
   }

   // Handle file upload
   const fileInput = document.getElementById('file');
   const file = fileInput?.files[0];

   if (!file) {
     throw new Error('Banner photo is required');
   }

   // Upload the file
   const fileName = `${Date.now()}-${file.name}`;
   const storageRef = ref(storage, `banners/${user.uid}/${fileName}`);
   
   const snapshot = await uploadBytes(storageRef, file);
   const bannerPhotoURL = await getDownloadURL(snapshot.ref);
   newTrip.bannerPhoto = bannerPhotoURL;

   // Log the trip data being sent
   console.log('Sending trip data:', newTrip);

   const response = await fetch('/trips', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${token}`
     },
     body: JSON.stringify(newTrip),
   });

   if (!response.ok) {
     const errorData = await response.json();
     throw new Error(errorData.message || 'Failed to save trip data.');
   }

   alert('Trip added successfully!');
   window.location.href = 'home.html';
 } catch (error) {
   console.error('Error saving trip:', error);
   alert(error.message || 'Failed to save trip. Please try again.');
 }
});

// Check authentication on page load
auth.onAuthStateChanged((user) => {
 if (!user) {
   window.location.href = 'login.html';
 }
});
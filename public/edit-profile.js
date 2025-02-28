import { auth, db, storage } from '../firebase.js';
import { 
  doc, getDoc, updateDoc, collection, query, where, getDocs 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Countries data
const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
  "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Chad", "Chile",
  "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark",
  "Ecuador", "Egypt", "El Salvador", "Eritrea", "Estonia", "Ethiopia", "Fiji", "Finland", "France", "Gabon",
  "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guyana", "Haiti", "Honduras",
  "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica",
  "Japan", "Jordan", "Kazakhstan", "Kenya", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho",
  "Libya", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Mexico",
  "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Nepal", "Netherlands", "New Zealand",
  "Nicaragua", "Niger", "Nigeria", "North Korea", "Norway", "Oman", "Pakistan", "Panama", "Paraguay", "Peru",
  "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saudi Arabia", "Senegal", "Serbia",
  "Singapore", "Slovakia", "Slovenia", "Somalia", "South Africa", "South Korea", "Spain", "Sri Lanka", "Sudan", "Sweden",
  "Switzerland", "Syria", "Taiwan", "Tanzania", "Thailand", "Tunisia", "Turkey", "Uganda", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

export function showEditProfileModal() {
  if (!document.getElementById('edit-profile-styles')) {
    const styles = `
      <style id="edit-profile-styles">
        /* Base modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.edit-profile-modal {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.3s ease-out;
}

/* Modal Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #edf2f7;
  position: sticky;
  top: 0;
  background: white;
  border-radius: 16px 16px 0 0;
  z-index: 10;
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #718096;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-button:hover {
  background: #f7fafc;
  color: #4a5568;
}

/* Modal Content */
.modal-content {
  padding: 2rem;
}

/* Profile Image Section */
.profile-image-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem 0 2rem;
}

.profile-image-container {
  position: relative;
  width: 120px;
  height: 120px;
  margin-bottom: 1rem;
}

.profile-image {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.image-upload-label {
  position: absolute;
  bottom: 5px;
  right: 5px;
  background: #4299e1;
  color: white;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.image-upload-label:hover {
  background: #3182ce;
  transform: scale(1.05);
}

/* Form Elements */
.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #4a5568;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s;
  background: #f8fafc;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.15);
  background: white;
}

.form-group textarea {
  height: 120px;
  resize: vertical;
}

.form-hint {
  font-size: 0.875rem;
  color: #718096;
  margin-top: 0.25rem;
}

/* Location Autocomplete Styles */
.location-wrapper {
  position: relative;
}

.location-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-top: none;
  border-radius: 0 0 8px 8px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: none;
}

.location-dropdown.active {
  display: block;
}

.location-option {
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.location-option:hover {
  background: #f7fafc;
}

.location-option.highlighted {
  background: #edf2f7;
}

/* Scrollbar styles for location dropdown */
.location-dropdown::-webkit-scrollbar {
  width: 8px;
}

.location-dropdown::-webkit-scrollbar-track {
  background: #f7fafc;
  border-radius: 0 0 8px 0;
}

.location-dropdown::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 4px;
}

.location-dropdown::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

/* Button Group */
.button-group {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem 2rem;
  border-top: 1px solid #edf2f7;
  position: sticky;
  bottom: 0;
  background: white;
  border-radius: 0 0 16px 16px;
}

.cancel-button {
  padding: 0.75rem 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  color: #4a5568;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-button:hover {
  background: #f7fafc;
  border-color: #cbd5e0;
}

.save-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  background: #4299e1;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.save-button:hover {
  background: #3182ce;
  transform: translateY(-1px);
}

.save-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

/* Error Message */
.error-message {
  color: #e53e3e;
  margin-top: 0.5rem;
  font-size: 0.875rem;
}

/* Responsive Styles */
@media (max-width: 640px) {
  .edit-profile-modal {
    width: 100%;
    height: 100%;
    max-height: 100vh;
    border-radius: 0;
  }

  .modal-header,
  .button-group {
    border-radius: 0;
  }

  .modal-content {
    padding: 1.5rem;
  }

  .button-group {
    padding: 1rem 1.5rem;
  }
}

/* Loading State Styles */
.save-button.loading {
  position: relative;
  color: transparent;
}

.save-button.loading::after {
  content: "";
  position: absolute;
  width: 20px;
  height: 20px;
  top: 50%;
  left: 50%;
  margin: -10px 0 0 -10px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s infinite linear;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
      </style>
    `;
    document.head.insertAdjacentHTML('beforeend', styles);
  }

  const modalHTML = `
    <div class="modal-overlay" id="edit-profile-modal">
      <div class="edit-profile-modal">
        <div class="modal-header">
          <h2>Edit Profile</h2>
          <button class="close-button" aria-label="Close modal">×</button>
        </div>
        <form id="edit-profile-form">
          <div class="modal-content">
            <div class="profile-image-section">
              <div class="profile-image-container">
                <img src="/api/placeholder/100/100" alt="Profile" class="profile-image" id="profile-preview">
                <label class="image-upload-label" for="profile-image" title="Change profile photo">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12h14" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </label>
                <input type="file" id="profile-image" accept="image/*" style="display: none;">
              </div>
            </div>

            <div class="form-group">
              <label for="displayName">Display Name</label>
              <input type="text" id="displayName" name="displayName" required>
              <div class="form-hint">This will be your public display name</div>
            </div>

            <div class="form-group">
              <label for="bio">Bio</label>
              <textarea id="bio" name="bio" placeholder="Tell us about yourself..."></textarea>
            </div>

            <div class="form-group">
              <label for="location">Location</label>
              <div class="location-wrapper">
                <input type="text" id="location" name="location" placeholder="Start typing a country name..." autocomplete="off">
                <div class="location-dropdown" id="location-dropdown"></div>
              </div>
            </div>

            <div class="form-group">
              <label for="birthday">Birthday</label>
              <input type="date" id="birthday" name="birthday">
            </div>

            <div class="form-group">
              <label for="website">Website</label>
              <input type="url" id="website" name="website" placeholder="https://example.com">
            </div>

            <div class="error-message" id="error-message"></div>
          </div>

          <div class="button-group">
            <button type="button" class="cancel-button">Cancel</button>
            <button type="submit" class="save-button">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Add modal to document
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Get all necessary elements
  const modal = document.getElementById('edit-profile-modal');
  const form = document.getElementById('edit-profile-form');
  const closeButton = modal.querySelector('.close-button');
  const cancelButton = modal.querySelector('.cancel-button');
  const imageInput = document.getElementById('profile-image');
  const imagePreview = document.getElementById('profile-preview');
  const errorMessage = document.getElementById('error-message');
  const locationInput = document.getElementById('location');
  const locationDropdown = document.getElementById('location-dropdown');
  let currentFocus = -1;

  // Location autocomplete functions
  function filterCountries(value) {
    const inputValue = value.toLowerCase();
    return countries.filter(country => 
      country.toLowerCase().startsWith(inputValue)
    );
  }

  function showDropdown(filteredCountries) {
    locationDropdown.innerHTML = '';
    if (filteredCountries.length > 0) {
      filteredCountries.forEach((country, index) => {
        const div = document.createElement('div');
        div.textContent = country;
        div.className = 'location-option';
        div.addEventListener('click', () => {
          locationInput.value = country;
          locationDropdown.classList.remove('active');
        });
        locationDropdown.appendChild(div);
      });
      locationDropdown.classList.add('active');
    } else {
      locationDropdown.classList.remove('active');
    }
  }

  function updateHighlight(options) {
    Array.from(options).forEach((option, index) => {
      option.classList.toggle('highlighted', index === currentFocus);
      if (index === currentFocus) {
        option.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  // Location input event listeners
  locationInput.addEventListener('input', (e) => {
    const value = e.target.value;
    if (value.length > 0) {
      const filteredCountries = filterCountries(value);
      showDropdown(filteredCountries);
    } else {
      locationDropdown.classList.remove('active');
    }
    currentFocus = -1;
  });

  locationInput.addEventListener('keydown', (e) => {
    const options = locationDropdown.getElementsByClassName('location-option');
    
    if (e.key === 'ArrowDown') {
      currentFocus = (currentFocus + 1) % options.length;
      updateHighlight(options);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      currentFocus = (currentFocus - 1 + options.length) % options.length;
      updateHighlight(options);
      e.preventDefault();
    } else if (e.key === 'Enter' && currentFocus > -1) {
      if (options[currentFocus]) {
        locationInput.value = options[currentFocus].textContent;
        locationDropdown.classList.remove('active');
        e.preventDefault();
      }
    } else if (e.key === 'Escape') {
      locationDropdown.classList.remove('active');
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!locationInput.contains(e.target) && !locationDropdown.contains(e.target)) {
      locationDropdown.classList.remove('active');
    }
  });

  // Load current profile data
  async function loadProfileData() {
    try {
      const userProfileRef = collection(db, 'userProfiles');
      const q = query(userProfileRef, where('uid', '==', auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const profileData = querySnapshot.docs[0].data();
        
        document.getElementById('displayName').value = profileData.displayName || '';
        document.getElementById('bio').value = profileData.bio || '';
        document.getElementById('location').value = profileData.location || '';
        document.getElementById('birthday').value = profileData.birthday || '';
        document.getElementById('website').value = profileData.website || '';
        
        if (profileData.photoURL) {
          imagePreview.src = profileData.photoURL;
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      errorMessage.textContent = 'Failed to load profile data';
    }
  }

  // Handle image upload preview
  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreview.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = form.querySelector('.save-button');
    submitButton.disabled = true;
    errorMessage.textContent = '';

    try {
      let photoURL = imagePreview.src;
      const imageFile = imageInput.files[0];
      if (imageFile) {
        const storageRef = ref(storage, `profile-images/${auth.currentUser.uid}/${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        photoURL = await getDownloadURL(storageRef);
      }

      const profileData = {
        displayName: document.getElementById('displayName').value,
        bio: document.getElementById('bio').value,
        location: document.getElementById('location').value,
        birthday: document.getElementById('birthday').value,
        website: document.getElementById('website').value,
        photoURL: photoURL,
        updatedAt: new Date()
      };

      const userProfileRef = collection(db, 'userProfiles');
      const q = query(userProfileRef, where('uid', '==', auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, profileData);
        modal.remove();
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      errorMessage.textContent = 'Failed to update profile';
      submitButton.disabled = false;
    }
  });

  // Close modal handlers
  function closeModal() {
    modal.remove();
  }

  closeButton.addEventListener('click', closeModal);
  cancelButton.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Load current profile data when modal opens
  loadProfileData();
}
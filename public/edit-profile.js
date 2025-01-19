// edit-profile.js
import { auth, db, storage } from '../firebase.js';
import { 
  doc, getDoc, updateDoc, collection, query, where, getDocs 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export function showEditProfileModal() {
  if (!document.getElementById('edit-profile-styles')) {
    const styles = `
      <style id="edit-profile-styles">
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

        .modal-content {
          padding: 2rem;
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

        .error-message {
          color: #e53e3e;
          margin-top: 0.5rem;
          font-size: 0.875rem;
        }

        .form-hint {
          font-size: 0.875rem;
          color: #718096;
          margin-top: 0.25rem;
        }

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
              <label for="username">Username</label>
              <input type="text" id="username" name="username" required>
              <div class="form-hint">This will be your public display name</div>
            </div>

            <div class="form-group">
              <label for="bio">Bio</label>
              <textarea id="bio" name="bio" placeholder="Tell us about yourself..."></textarea>
            </div>

            <div class="form-group">
              <label for="location">Location</label>
              <input type="text" id="location" name="location" placeholder="Where are you based?">
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

  const modal = document.getElementById('edit-profile-modal');
  const form = document.getElementById('edit-profile-form');
  const closeButton = modal.querySelector('.close-button');
  const cancelButton = modal.querySelector('.cancel-button');
  const imageInput = document.getElementById('profile-image');
  const imagePreview = document.getElementById('profile-preview');
  const errorMessage = document.getElementById('error-message');

  // Load current profile data
  async function loadProfileData() {
    try {
      const userProfileRef = collection(db, 'userProfiles');
      const q = query(userProfileRef, where('uid', '==', auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const profileData = querySnapshot.docs[0].data();
        
        // Fill form fields
        
        document.getElementById('username').value = profileData.username || '';
        document.getElementById('bio').value = profileData.bio || '';
        document.getElementById('location').value = profileData.location || '';
        document.getElementById('birthday').value = profileData.birthday || '';
        document.getElementById('website').value = profileData.website || '';
        
        // Set profile image if exists
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
      // Upload image if selected
      let photoURL = imagePreview.src;
      const imageFile = imageInput.files[0];
      if (imageFile) {
        const storageRef = ref(storage, `profile-images/${auth.currentUser.uid}/${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        photoURL = await getDownloadURL(storageRef);
      }

      // Update profile data
      const profileData = {
        
        username: document.getElementById('username').value,
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
        window.location.reload(); // Reload to show updated profile
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
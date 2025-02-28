import { auth } from '../firebase.js';

export function handleReportSubmission(tripId, reason, comment) {
  return new Promise(async (resolve, reject) => {
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`/trips/${tripId}/report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason,
          comment,
         
        })
      });

      if (!response.ok) {
        // Parse error response as JSON if possible
        const errorData = await response.json().catch(() => ({
          message: response.statusText
        }));
        throw new Error(errorData.message || `Report failed (${response.status})`);
      }

      // ... rest of existing code ...
    } catch (error) {
      console.error('Full report error:', error);
      reject(error);
    }
  });
}

export function initializeReportModal() {
  const reportModal = document.getElementById('reportModal');
  const reportButton = document.getElementById('reportButton');
  const closeButton = reportModal.querySelector('.close');
  const cancelButton = reportModal.querySelector('.cancel-button');
  const submitButton = reportModal.querySelector('.submit-button');
  const reportComment = document.getElementById('reportComment');
  const reportOptions = document.getElementsByName('reportReason');

  function showMessage(message, type) {
    const existingMessage = reportModal.querySelector('.report-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `report-message ${type}`;
    messageDiv.textContent = message;
    submitButton.parentElement.insertBefore(messageDiv, submitButton);
  }

  function resetForm() {
    reportComment.value = '';
    reportOptions.forEach(option => option.checked = false);
    const message = reportModal.querySelector('.report-message');
    if (message) {
      message.remove();
    }
    submitButton.disabled = false;
    submitButton.textContent = 'Submit Report';
  }

  function closeModal() {
    reportModal.style.display = "none";
    resetForm();
  }

  // Open modal
  reportButton.onclick = () => {
    reportModal.style.display = "block";
  };

  // Close modal handlers
  closeButton.onclick = closeModal;
  cancelButton.onclick = closeModal;
  
  // Close when clicking outside
  window.onclick = (event) => {
    if (event.target === reportModal) {
      closeModal();
    }
  };

  // Handle submit
  submitButton.onclick = async () => {
    const selectedReason = document.querySelector('input[name="reportReason"]:checked');
    
    if (!selectedReason) {
      showMessage('Please select a reason for reporting.', 'report-error');
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get('id');

    try {
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting...';

      await handleReportSubmission(
        tripId,
        selectedReason.value,
        reportComment.value.trim()
      );

      showMessage('Thank you for your report. We will review it shortly.', 'report-success');
      
      // Close modal after delay
      setTimeout(closeModal, 2000);

    } catch (error) {
      showMessage('Failed to submit report. Please try again.', 'report-error');
      submitButton.disabled = false;
      submitButton.textContent = 'Submit Report';
    }
  };
}
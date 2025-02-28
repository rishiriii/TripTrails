import { db } from '../firebase.js';  // ✅ Use Web SDK for frontend
import { auth } from '../firebase.js'; // ✅ Import Firebase Auth
import { getAuth } from 'firebase/auth';
import { signOut } from 'firebase/auth';
// ✅ Ensure `auth` is initialized
const authInstance = getAuth();

import { collection, query, where, getDocs, updateDoc, deleteDoc,doc } from 'firebase/firestore';
window.searchUser = searchUser;
window.deleteUser = deleteUser;
window.deleteTrip = deleteTrip;
window.editTrip = editTrip;
window.updateReport =updateReport;
window.viewTrip = viewTrip;
window.deleteTrips=deleteTrips;
// 🚀 Load all trips
async function fetchTrips() {
    const tripsRef = collection(db, 'trips');
    const tripsSnapshot = await getDocs(tripsRef);
    const trips = tripsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return trips;
}

// 🚀 Delete a trip
async function deleteTrips(tripId) {
    await deleteDoc(doc(db, 'trips', tripId));
        alert('Trip deleted successfully!');
        location.reload();
    
}

// 🚀 Edit a trip
async function editTrip(tripId) {
    const newTitle = prompt('Enter new trip title:');
    if (newTitle) {
        await updateDoc(doc(db, 'trips', tripId), { title: newTitle });
        alert('Trip updated successfully!');
        location.reload();
    }
}

// 🚀 Fetch user details
async function fetchUser(userId) {
    console.log(`🔍 Searching for user with UID: ${userId}`);

    const usersRef = collection(db, 'userProfiles');
    const q = query(usersRef, where('uid', '==', userId));
    const querySnapshot = await getDocs(q);

    console.log(`📌 Total users found in Firestore: ${querySnapshot.size}`);  // Debugging log

    if (querySnapshot.empty) {
        console.log(`❌ No user found for UID: ${userId}`);
        return null;
    }

    // Log all retrieved documents
    querySnapshot.forEach(doc => {
        console.log(`📄 Found user document:`, doc.data());
    });

    // Return the first matching user
    const userData = querySnapshot.docs[0].data();
    console.log(`✅ User found:`, userData);
    
    return userData;
}

// 🚀 Delete a user
async function deleteUser(userId) {
    if (!userId) {
        alert("No user ID provided!");
        return;
    }

    if (confirm(`Are you sure you want to delete user: ${userId}?`)) {
        console.log(`🗑️ Deleting user with ID: ${userId}`);
        
        try {
            const userRef = doc(db, 'userProfiles', userId);
            console.log(`📌 Firestore document path: userProfiles/${userId}`);

            await deleteDoc(userRef);
            console.log("✅ User deleted from Firestore!");

            alert('User deleted successfully!');
            location.reload();
        } catch (error) {
            console.error("❌ Error deleting user:", error);
            alert("Failed to delete user. Check console for details.");
        }
    }
}


// 🚀 Load reported trips
async function fetchReportedTrips() {
    const reportsRef = collection(db, 'tripReports');
    const q = query(reportsRef, where('status', '==', 'pending'));
    const reportsSnapshot = await getDocs(q);

    return reportsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}


// 🚀 Approve or Reject a Report
async function updateReport(reportId, status) {
    const notes = prompt('Add review notes:') || 'No additional notes';
    await updateDoc(doc(db, 'tripReports', reportId), {
        status,
        reviewNotes: notes,
        reviewedAt: new Date().toISOString(),
    });
    alert(`Report marked as ${status}`);
    location.reload();
}

// 🏆 Display trips in admin panel
async function displayTrips() {
    const trips = await fetchTrips();
    const tripsContainer = document.getElementById('tripsContainer');
    tripsContainer.innerHTML = trips.map(trip => `
        <div class="trip">
            <h3>${trip.title}</h3>
            <p><b>Start:</b> ${trip.start} → <b>End:</b> ${trip.end}</p>
           <button onclick="window.location.href='edit-trip.html?id=${trip.id}'">✏️ Edit</button>
            <button onclick="deleteTrips('${trip.id}')">🗑️ Delete</button>
        </div>
    `).join('');
}

// 🏆 Display reported trips
async function displayReports() {
    const reports = await fetchReportedTrips();
    const reportsContainer = document.getElementById('reportsContainer');

    reportsContainer.innerHTML = reports.map(report => `
        <div class="report">
            <h3>Reported Trip: ${report.reportedTripData.title}</h3>
            <p><b>Reason:</b> ${report.reason}</p>
            <p><b>Details:</b> ${report.details}</p>
            <p><b>Status:</b> ${report.status}</p>
            
            <button onclick="viewTrip('${report.tripId}')">🔍 View Trip</button>
            <button onclick="deleteTrip('${report.tripId}')">🗑️ Delete Trip</button>
            <button onclick="updateReport('${report.id}', 'rejected')">❌ Reject Review</button>
        </div>
    `).join('');
}

// 🏆 Display user details
async function searchUser() {
    const userId = document.getElementById('searchUserId').value.trim();
    
    if (!userId) {
        alert('Enter a User ID');
        return;
    }

    const user = await fetchUser(userId);

    if (!user) {
        alert('User not found');
        return;
    }

    document.getElementById('userDetails').innerHTML = `
        <h3>User: ${user.username || 'No Name'}</h3>
        <p><b>Email:</b> ${user.email || 'No Email'}</p>
        <button onclick="deleteUser('${user.uid}')">🗑️ Delete User</button>
    `;
}

async function viewTrip(tripId) {
    if (!tripId) {
        alert("Invalid trip ID");
        return;
    }

    const user = auth.currentUser;
    if (!user) {
        alert("You need to log in again.");
        window.location.href = "login.html"; // Redirect to login if not authenticated
        return;
    }

    const token = await user.getIdToken(); // Get the Firebase auth token
    window.location.href = `trip-details.html?id=${tripId}&token=${token}`;
}


async function deleteTrip(tripId) {
    if (!tripId) {
        alert("Invalid trip ID");
        return;
    }

    if (confirm('Are you sure you want to delete this trip?')) {
        try {
            await deleteDoc(doc(db, 'trips', tripId));

            // 🔥 Mark Report as "Approved" Since the Trip is Deleted
            const reportsRef = collection(db, 'tripReports');
            const q = query(reportsRef, where('tripId', '==', tripId));
            const reportsSnapshot = await getDocs(q);

            reportsSnapshot.forEach(async (report) => {
                await updateDoc(doc(db, 'tripReports', report.id), { status: 'approved' });
                console.log(`✅ Report ${report.id} marked as Approved.`);
            });

            alert('Trip deleted and report marked as approved!');
            location.reload();
        } catch (error) {
            console.error("❌ Error deleting trip:", error);
            alert("Failed to delete trip. Check console for details.");
        }
    }
}

async function logout() {
    try {
        await signOut(auth);
        alert('Logged out successfully!');
        window.location.href = 'login.html'; // Redirect to login page
    } catch (error) {
        console.error("Logout failed:", error);
        alert("Failed to log out. Try again.");
    }
}

// ✅ Ensure logout function is available globally
window.logout = logout;


// 🎯 Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    displayTrips();
    displayReports();
});

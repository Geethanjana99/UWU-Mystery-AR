// ar.js - AR scene logic for mystery object hunt

// Target coordinates
const TARGET_LAT = 6.985462148939262;
const TARGET_LON = 81.0734485580701;
const THRESHOLD_METERS = 25; // Show object if within 25 meters

const box = document.getElementById('mysteryBox');
const popup = document.getElementById('popup');
const loadingIndicator = document.getElementById('loadingIndicator');

// Debug function to check camera access
function debugCameraAccess() {
  console.log('🔍 Checking camera access...');
  console.log('User Agent:', navigator.userAgent);
  console.log('Is mobile:', /Mobi|Android/i.test(navigator.userAgent));
  console.log('Protocol:', window.location.protocol);
  
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error('❌ getUserMedia not supported');
    alert('Your browser does not support camera access. Please use a modern browser.');
    return;
  }

  navigator.mediaDevices.getUserMedia({ 
    video: { 
      facingMode: 'environment',
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 }
    } 
  })
    .then(function(stream) {
      console.log('✅ Camera access granted');
      console.log('Camera constraints:', stream.getVideoTracks()[0].getSettings());
      // Stop the stream since AR.js will handle it
      stream.getTracks().forEach(track => track.stop());
      
      // Hide loading indicator since camera works
      setTimeout(() => {
        if (loadingIndicator) {
          loadingIndicator.style.display = 'none';
        }
      }, 3000);
    })
    .catch(function(err) {
      console.error('❌ Camera access denied:', err);
      
      // Show user-friendly error message
      if (loadingIndicator) {
        loadingIndicator.innerHTML = `
          <div class="spinner"></div>
          <p>Camera access required</p>
          <p style="font-size: 14px;">Please allow camera permissions and refresh the page</p>
          <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #2b7a78; color: white; border: none; border-radius: 4px;">Retry</button>
        `;
      }
    });
}

// Initialize AR scene and camera
function initializeAR() {
  console.log('🚀 Initializing AR scene...');
  
  // Wait for A-Frame to be ready
  const scene = document.querySelector('a-scene');
  
  if (scene) {
    scene.addEventListener('renderstart', function() {
      console.log('📷 AR scene render started');
      // Hide loading indicator when camera starts
      setTimeout(() => {
        if (loadingIndicator) {
          loadingIndicator.style.display = 'none';
        }
      }, 2000);
    });
    
    scene.addEventListener('loaded', function() {
      console.log('✅ AR scene loaded successfully');
    });
    
    // Listen for camera stream start
    scene.addEventListener('camera-init', function() {
      console.log('📹 Camera initialized');
      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
      }
    });
    
    // Fallback timeout to hide loading indicator
    setTimeout(() => {
      console.log('⏰ Timeout reached, hiding loading indicator');
      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
      }
    }, 8000);
  }
}

// Helper: Haversine formula for distance between two lat/lon points
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Listen for GPS updates from AR.js
window.addEventListener('gps-camera-update-position', function(e) {
  const { latitude, longitude } = e.detail.position;
  const dist = getDistanceMeters(latitude, longitude, TARGET_LAT, TARGET_LON);
  if (dist < THRESHOLD_METERS) {
    box.setAttribute('visible', 'true');
  } else {
    box.setAttribute('visible', 'false');
  }
});

// Handle tap/click on the AR object
box.addEventListener('click', function () {
  box.setAttribute('visible', 'false');
  popup.classList.remove('hidden');
  setTimeout(() => popup.classList.add('hidden'), 3500);
  alert('🎉 You found the hidden object!');
});

// On load, hide popup and initialize
window.onload = () => {
  popup.classList.add('hidden');
  debugCameraAccess();
  initializeAR();
};

// ar.js - AR scene logic for mystery object hunt

// Target coordinates
const TARGET_LAT = 6.985462148939262;
const TARGET_LON = 81.0734485580701;
const THRESHOLD_METERS = 25; // Show object if within 25 meters

const mysteryBox = document.getElementById('mysteryBox');
const testBox = document.getElementById('testBox');
const popup = document.getElementById('popup');
const loadingIndicator = document.getElementById('loadingIndicator');

let gpsEnabled = false;
let userLocation = null;

// Debug function to check camera access
function debugCameraAccess() {
  console.log('🔍 Checking camera access...');
  console.log('User Agent:', navigator.userAgent);
  console.log('Is mobile:', /Mobi|Android/i.test(navigator.userAgent));
  console.log('Protocol:', window.location.protocol);
  
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error('❌ getUserMedia not supported');
    showError('Your browser does not support camera access. Please use a modern browser.');
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
      console.log('Camera settings:', stream.getVideoTracks()[0].getSettings());
      
      // Don't stop the stream immediately, let it run for a moment
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        console.log('🔄 Test stream stopped, AR.js should take over');
      }, 1000);
      
      // Force AR.js to initialize camera
      initializeARCamera();
      
    })
    .catch(function(err) {
      console.error('❌ Camera access denied:', err);
      showError('Camera access required. Please allow camera permissions and refresh the page.');
    });
}

// Force AR.js camera initialization
function initializeARCamera() {
  console.log('🎥 Forcing AR.js camera initialization...');
  
  // Try to trigger AR.js camera setup
  const scene = document.querySelector('a-scene');
  if (scene && scene.systems && scene.systems.arjs) {
    console.log('📡 AR.js system found, attempting to start camera');
    try {
      // Force AR.js to start
      if (scene.systems.arjs.start) {
        scene.systems.arjs.start();
      }
    } catch (e) {
      console.log('⚠️ Could not force start AR.js:', e.message);
    }
  }
  
  // Alternative: manually create video element if needed
  setTimeout(checkVideoElement, 2000);
}

// Check if video element exists and is displaying
function checkVideoElement() {
  const videos = document.querySelectorAll('video');
  console.log('🎬 Found video elements:', videos.length);
  
  videos.forEach((video, index) => {
    console.log(`Video ${index}:`, {
      src: video.src,
      srcObject: !!video.srcObject,
      readyState: video.readyState,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      style: video.style.cssText
    });
    
    // Ensure video is visible and playing
    video.style.display = 'block';
    video.style.visibility = 'visible';
    video.style.opacity = '1';
    video.play().catch(e => console.log('Video play error:', e));
  });
  
  if (videos.length === 0) {
    console.log('❌ No video elements found - camera background missing');
    showCameraError();
  }
}

function showCameraError() {
  if (loadingIndicator) {
    loadingIndicator.innerHTML = `
      <div style="color: #ff6b6b;">📹 Camera background not visible</div>
      <div style="font-size: 14px; margin-top: 10px;">
        AR objects are working but camera view is missing.<br>
        This might be a browser compatibility issue.
      </div>
      <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #2b7a78; color: white; border: none; border-radius: 4px;">Retry</button>
    `;
  }
}

function showError(message) {
  if (loadingIndicator) {
    loadingIndicator.innerHTML = `
      <div style="color: #ff6b6b;">❌ ${message}</div>
      <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #2b7a78; color: white; border: none; border-radius: 4px;">Retry</button>
    `;
  }
}

// Initialize AR scene and camera
function initializeAR() {
  console.log('🚀 Initializing AR scene...');
  
  const scene = document.querySelector('a-scene');
  
  if (scene) {
    let renderStarted = false;
    let cameraVisible = false;
    
    scene.addEventListener('renderstart', function() {
      if (!renderStarted) {
        renderStarted = true;
        console.log('📷 AR scene render started - camera should be active');
        
        // Check for video after render starts
        setTimeout(checkVideoElement, 1000);
        
        // Hide loading indicator when camera starts rendering
        setTimeout(() => {
          if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
          }
        }, 2000);
      }
    });
    
    scene.addEventListener('loaded', function() {
      console.log('✅ AR scene loaded successfully');
    });
    
    // Listen for AR.js specific events
    scene.addEventListener('arjs-video-loaded', function() {
      console.log('📹 AR.js video loaded');
      cameraVisible = true;
    });
    
    // Ensure loading indicator is hidden after reasonable time
    setTimeout(() => {
      console.log('⏰ Timeout reached, checking camera status');
      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
      }
      
      // If no video is visible, try manual camera setup
      if (!cameraVisible) {
        console.log('🔧 Camera background not visible, trying manual setup');
        tryManualCameraSetup();
      }
    }, 6000);
  }
}

// Try to manually create camera background if AR.js fails
function tryManualCameraSetup() {
  console.log('🛠️ Attempting manual camera setup...');
  
  navigator.mediaDevices.getUserMedia({ 
    video: { 
      facingMode: 'environment',
      width: { ideal: 1280 },
      height: { ideal: 720 }
    } 
  })
  .then(function(stream) {
    console.log('� Manual camera stream obtained');
    
    // Create video element for background
    let video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      z-index: -1;
    `;
    
    document.body.insertBefore(video, document.body.firstChild);
    
    video.onloadedmetadata = function() {
      console.log('✅ Manual video background is now visible');
      video.play();
    };
  })
  .catch(function(err) {
    console.error('❌ Manual camera setup failed:', err);
    showCameraError();
  });
}

// Setup GPS tracking (separate from camera)
function setupGPS() {
  console.log('🌍 Setting up GPS tracking...');
  
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      function(position) {
        console.log('✅ GPS location obtained');
        userLocation = {
          lat: position.coords.latitude,
          lon: position.coords.longitude
        };
        gpsEnabled = true;
        enableGPSFeatures();
        checkDistance();
      },
      function(error) {
        console.log('⚠️ GPS not available:', error.message);
        // Continue without GPS - camera should still work
        gpsEnabled = false;
        showFallbackMessage();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
    
    // Watch position for updates
    navigator.geolocation.watchPosition(
      function(position) {
        if (gpsEnabled) {
          userLocation = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          };
          checkDistance();
        }
      },
      function(error) {
        console.log('GPS watch error:', error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30000
      }
    );
  } else {
    console.log('⚠️ Geolocation not supported');
    showFallbackMessage();
  }
}

function enableGPSFeatures() {
  // Add GPS camera component gradually
  const camera = document.querySelector('a-camera');
  if (camera && gpsEnabled) {
    camera.setAttribute('gps-camera', '');
    camera.setAttribute('rotation-reader', '');
    console.log('📍 GPS camera features enabled');
  }
}

function showFallbackMessage() {
  // Show the test box and hide mystery box if GPS fails
  if (testBox) {
    testBox.setAttribute('visible', 'true');
  }
  console.log('📦 Showing test box instead of GPS-based content');
}

function checkDistance() {
  if (!userLocation || !gpsEnabled) return;
  
  const dist = getDistanceMeters(userLocation.lat, userLocation.lon, TARGET_LAT, TARGET_LON);
  console.log(`📍 Distance to target: ${dist.toFixed(1)}m`);
  
  if (dist < THRESHOLD_METERS) {
    if (mysteryBox) {
      mysteryBox.setAttribute('visible', 'true');
      console.log('🎯 Mystery box is now visible!');
    }
  } else {
    if (mysteryBox) {
      mysteryBox.setAttribute('visible', 'false');
    }
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

// Listen for GPS updates from AR.js (backup method)
window.addEventListener('gps-camera-update-position', function(e) {
  if (gpsEnabled) {
    const { latitude, longitude } = e.detail.position;
    userLocation = { lat: latitude, lon: longitude };
    checkDistance();
  }
});

// Handle tap/click on the AR objects
if (mysteryBox) {
  mysteryBox.addEventListener('click', function () {
    mysteryBox.setAttribute('visible', 'false');
    popup.classList.remove('hidden');
    setTimeout(() => popup.classList.add('hidden'), 3500);
    alert('🎉 You found the hidden object!');
  });
}

if (testBox) {
  testBox.addEventListener('click', function () {
    alert('📦 Test box clicked! Camera is working.');
  });
}

// On load, hide popup and initialize
window.onload = () => {
  popup.classList.add('hidden');
  debugCameraAccess();
  initializeAR();
  
  // Start GPS setup after a delay
  setTimeout(setupGPS, 3000);
};

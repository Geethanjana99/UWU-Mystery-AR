// ar.js - AR scene logic for mystery object hunt

// Target coordinates - Main location
const TARGET_LAT = 6.985161867439368;
const TARGET_LON = 81.07362372073608;
const THRESHOLD_METERS = 5; // Show mystery boxes when within 50 meters

// Multiple mystery box locations around the main target
const MYSTERY_LOCATIONS = [
  { id: 'mysteryBox1', lat: 6.985161867439368, lon: 81.07362372073608, color: '#FF0000' }, // Red - Main
  { id: 'mysteryBox2', lat: 6.985261867439365, lon: 81.07372372073602, color: '#00FF00' }, // Green - North-East
  { id: 'mysteryBox3', lat: 6.985061867439366, lon: 81.07352372073608, color: '#0000FF' }, // Blue - South-West  
  { id: 'mysteryBox4', lat: 6.985261867439367, lon: 81.07352372073604, color: '#FFFF00' }, // Yellow - North-West
  { id: 'mysteryBox5', lat: 6.985061867439368, lon: 81.07372372073608, color: '#FF00FF' }  // Magenta - South-East
];

const mysteryBoxes = MYSTERY_LOCATIONS.map(loc => document.getElementById(loc.id)).filter(box => box);
const testBox = document.getElementById('testBox');
const popup = document.getElementById('popup');
const loadingIndicator = document.getElementById('loadingIndicator');

let gpsEnabled = false;
let userLocation = null;
let debugMode = false; // Disable debug mode - only show at correct location
let foundBoxes = new Set(); // Track found boxes
let directionHint = null; // For direction indicator

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
        createDirectionHint(); // Create direction hint when GPS is available
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
  
  // Create direction hint UI
  createDirectionHint();
}

// Create direction hint UI
function createDirectionHint() {
  if (directionHint) return; // Already created
  
  directionHint = document.createElement('div');
  directionHint.id = 'directionHint';
  directionHint.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 15px;
    border-radius: 10px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 1000;
    min-width: 200px;
  `;
  directionHint.innerHTML = `
    <div style="text-align: center; margin-bottom: 10px;">
      🧭 <strong>Mystery Hunt Guide</strong>
    </div>
    <div id="hintContent">Getting location...</div>
  `;
  document.body.appendChild(directionHint);
}

// Calculate bearing (direction) from current location to target
function calculateBearing(lat1, lon1, lat2, lon2) {
  const toRad = deg => deg * Math.PI / 180;
  const toDeg = rad => rad * 180 / Math.PI;
  
  const dLon = toRad(lon2 - lon1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  let bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360; // Normalize to 0-360
}

// Get direction emoji based on bearing
function getDirectionEmoji(bearing) {
  if (bearing >= 337.5 || bearing < 22.5) return '⬆️ North';
  if (bearing >= 22.5 && bearing < 67.5) return '↗️ Northeast';
  if (bearing >= 67.5 && bearing < 112.5) return '➡️ East';
  if (bearing >= 112.5 && bearing < 157.5) return '↘️ Southeast';
  if (bearing >= 157.5 && bearing < 202.5) return '⬇️ South';
  if (bearing >= 202.5 && bearing < 247.5) return '↙️ Southwest';
  if (bearing >= 247.5 && bearing < 292.5) return '⬅️ West';
  if (bearing >= 292.5 && bearing < 337.5) return '↖️ Northwest';
}

// Update direction hint
function updateDirectionHint() {
  if (!directionHint || !userLocation) return;
  
  const hintContent = document.getElementById('hintContent');
  if (!hintContent) return;
  
  // Find closest mystery box
  let closestBox = null;
  let closestDistance = Infinity;
  
  MYSTERY_LOCATIONS.forEach(location => {
    if (foundBoxes.has(location.id)) return; // Skip found boxes
    
    const dist = getDistanceMeters(userLocation.lat, userLocation.lon, location.lat, location.lon);
    if (dist < closestDistance) {
      closestDistance = dist;
      closestBox = location;
    }
  });
  
  if (closestBox) {
    const bearing = calculateBearing(userLocation.lat, userLocation.lon, closestBox.lat, closestBox.lon);
    const direction = getDirectionEmoji(bearing);
    
    hintContent.innerHTML = `
      <div style="margin-bottom: 5px;">
        <strong>Closest Box:</strong> <span style="color: ${closestBox.color};">●</span> ${closestBox.id}
      </div>
      <div style="margin-bottom: 5px;">
        📍 <strong>${closestDistance.toFixed(1)}m</strong> away
      </div>
      <div style="margin-bottom: 5px;">
        🧭 <strong>${direction}</strong>
      </div>
      <div style="font-size: 12px; opacity: 0.8;">
        Found: ${foundBoxes.size}/5 boxes
      </div>
    `;
    
    // Show distance warning
    if (closestDistance > THRESHOLD_METERS) {
      hintContent.innerHTML += `<div style="color: #ffaa00; font-size: 12px; margin-top: 5px;">Get within ${THRESHOLD_METERS}m to see the box!</div>`;
    } else {
      hintContent.innerHTML += `<div style="color: #00ff00; font-size: 12px; margin-top: 5px;">✅ Box should be visible! Look around!</div>`;
    }
  } else {
    hintContent.innerHTML = `
      <div style="color: #00ff00;">
        🎉 All boxes found!<br>
        Congratulations!
      </div>
    `;
  }
}

function checkDistance() {
  if (!userLocation || !gpsEnabled) {
    console.log('⏳ Waiting for GPS location...');
    return;
  }
  
  console.log(`📍 Current location: ${userLocation.lat.toFixed(6)}, ${userLocation.lon.toFixed(6)}`);
  
  // Check each mystery box location
  MYSTERY_LOCATIONS.forEach((location, index) => {
    if (foundBoxes.has(location.id)) return; // Skip already found boxes
    
    const dist = getDistanceMeters(userLocation.lat, userLocation.lon, location.lat, location.lon);
    const boxElement = document.getElementById(location.id);
    
    console.log(`📍 ${location.id} distance: ${dist.toFixed(1)}m (threshold: ${THRESHOLD_METERS}m)`);
    
    if (dist < THRESHOLD_METERS) {
      if (boxElement) {
        boxElement.setAttribute('visible', 'true');
        console.log(`🎯 ${location.id} is now visible! Distance: ${dist.toFixed(1)}m`);
      }
    } else {
      if (boxElement) {
        boxElement.setAttribute('visible', 'false');
      }
    }
  });
  
  // Update direction hint
  updateDirectionHint();
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
MYSTERY_LOCATIONS.forEach((location) => {
  const boxElement = document.getElementById(location.id);
  if (boxElement) {
    boxElement.addEventListener('click', function () {
      console.log(`🎉 ${location.id} clicked!`);
      boxElement.setAttribute('visible', 'false');
      foundBoxes.add(location.id);
      
      if (popup) {
        popup.classList.remove('hidden');
        setTimeout(() => popup.classList.add('hidden'), 3500);
      }
      
      // Show success message with distance
      if (userLocation) {
        const dist = getDistanceMeters(userLocation.lat, userLocation.lon, location.lat, location.lon);
        const remaining = MYSTERY_LOCATIONS.length - foundBoxes.size;
        
        if (remaining > 0) {
          alert(`🎉 Great! You found ${location.id}!\n📍 You were ${dist.toFixed(1)}m away.\n🎯 ${remaining} more boxes to find!`);
        } else {
          alert(`🎉 CONGRATULATIONS! You found ALL mystery boxes!\n📍 Final box was ${dist.toFixed(1)}m away.\n🏆 Quest Complete!`);
        }
      } else {
        alert(`🎉 You found ${location.id}!`);
      }
      
      // Update direction hint after finding a box
      updateDirectionHint();
    });
  }
});

if (testBox) {
  testBox.addEventListener('click', function () {
    console.log('📦 Test box clicked!');
    if (userLocation) {
      // Find closest mystery box for reference
      let closestDistance = Infinity;
      MYSTERY_LOCATIONS.forEach(location => {
        if (!foundBoxes.has(location.id)) {
          const dist = getDistanceMeters(userLocation.lat, userLocation.lon, location.lat, location.lon);
          if (dist < closestDistance) closestDistance = dist;
        }
      });
      
      alert(`📦 Test box clicked! Camera is working.\n📍 Closest mystery box: ${closestDistance.toFixed(1)}m away\n🎯 You need to be within ${THRESHOLD_METERS}m to find mystery objects.\n📊 Found: ${foundBoxes.size}/${MYSTERY_LOCATIONS.length} boxes`);
    } else {
      alert('📦 Test box clicked! Camera is working.\n📍 Getting your location...');
    }
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

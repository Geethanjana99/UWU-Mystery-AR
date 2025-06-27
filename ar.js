// ar.js - AR scene logic for mystery object hunt

// Target coordinates - Main location
const TARGET_LAT = 6.985161867439368;
const TARGET_LON = 81.07362372073608;
const THRESHOLD_METERS = 5; // Show mystery boxes when within 5 meters (small range for buildings)

// Multiple mystery box locations in a very small area (20m x 20m range for buildings)
const MYSTERY_LOCATIONS = [
  { id: 'mysteryBox1', lat: 6.985161867439368, lon: 81.07362372073608, color: '#FF0000' }, // Red - Central location
  { id: 'mysteryBox2', lat: 6.985181867439368, lon: 81.07372372073608, color: '#00FF00' }, // Green - 2m North, 10m East
  { id: 'mysteryBox3', lat: 6.985141867439368, lon: 81.07352372073608, color: '#0000FF' }, // Blue - 2m South, 10m West  
  { id: 'mysteryBox4', lat: 6.985171867439368, lon: 81.07352372073608, color: '#FFFF00' }, // Yellow - 1m North, 10m West
  { id: 'mysteryBox5', lat: 6.985151867439368, lon: 81.07372372073608, color: '#FF00FF' }  // Magenta - 1m South, 10m East
];

const mysteryBoxes = MYSTERY_LOCATIONS.map(loc => document.getElementById(loc.id)).filter(box => box);
const testBox = document.getElementById('testBox');
const popup = document.getElementById('popup');
const loadingIndicator = document.getElementById('loadingIndicator');

let gpsEnabled = false;
let userLocation = null;
let debugMode = false; // Set to true to enable test box for AR testing
let foundBoxes = new Set(); // Track found boxes
let directionHint = null; // For direction indicator
let testMode = false; // Set to true to show test box instead of mystery boxes

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
  
  // Hide test box when GPS is working (normal game mode)
  if (testBox && !testMode) {
    testBox.setAttribute('visible', 'false');
    console.log('📦 Test box hidden - GPS working, game mode active');
  }
}

function showFallbackMessage() {
  // Only show test box if we're in test mode AND GPS fails
  if (testMode && testBox) {
    testBox.setAttribute('visible', 'true');
    console.log('📦 Showing test box for AR testing (GPS not available)');
  } else {
    console.log('📍 GPS not available, but test box hidden for game mode');
  }
  
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
      if (boxElement && boxElement.getAttribute('visible') !== 'true') {
        // Add special entrance animation when box becomes visible
        boxElement.setAttribute('visible', 'true');
        
        // Add entrance animation
        boxElement.setAttribute('animation__appear', 'property: scale; from: 0 0 0; to: 1 1 1; dur: 1000; easing: easeOutBounce');
        boxElement.setAttribute('animation__glow', 'property: rotation; from: 0 0 0; to: 0 720 0; dur: 2000; easing: easeOutQuad');
        
        console.log(`🎯 ${location.id} is now visible with animation! Distance: ${dist.toFixed(1)}m`);
        console.log(`📍 Box coordinates: ${location.lat}, ${location.lon}`);
        console.log(`👤 Your coordinates: ${userLocation.lat}, ${userLocation.lon}`);
        
        // Show on-screen notification
        showBoxFoundNotification(location.id, dist);
        
        // Remove entrance animations after they complete
        setTimeout(() => {
          boxElement.removeAttribute('animation__appear');
          boxElement.removeAttribute('animation__glow');
        }, 2000);
      }
    } else {
      if (boxElement && boxElement.getAttribute('visible') === 'true') {
        // Add exit animation before hiding
        boxElement.setAttribute('animation__disappear', 'property: scale; from: 1 1 1; to: 0 0 0; dur: 500; easing: easeInQuad');
        
        setTimeout(() => {
          boxElement.setAttribute('visible', 'false');
          boxElement.removeAttribute('animation__disappear');
        }, 500);
      }
    }
  });
  
  // Update direction hint
  updateDirectionHint();
}

// Show on-screen notification when box becomes visible
function showBoxFoundNotification(boxId, distance) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #4CAF50, #45a049);
    color: white;
    padding: 20px 30px;
    border-radius: 15px;
    font-size: 18px;
    font-weight: bold;
    z-index: 1001;
    box-shadow: 0 0 25px rgba(76, 175, 80, 0.6);
    animation: bounceIn 0.6s ease-out;
    text-align: center;
  `;
  
  notification.innerHTML = `
    🎯 <strong>${boxId} Found!</strong><br>
    <span style="font-size: 14px;">Distance: ${distance.toFixed(1)}m</span><br>
    <span style="font-size: 12px; opacity: 0.9;">Look around with your camera!</span>
  `;
  
  document.body.appendChild(notification);
  
  // Remove notification after 4 seconds
  setTimeout(() => {
    notification.remove();
  }, 4000);
}

// Debug function to show all boxes (for testing)
function showAllBoxes() {
  console.log('🔧 DEBUG: Showing all mystery boxes for testing');
  MYSTERY_LOCATIONS.forEach((location) => {
    const boxElement = document.getElementById(location.id);
    if (boxElement && !foundBoxes.has(location.id)) {
      boxElement.setAttribute('visible', 'true');
      console.log(`📦 ${location.id} forced visible`);
    }
  });
  console.log('💡 Use hideAllBoxes() to hide them again');
}

// Debug function to hide all boxes
function hideAllBoxes() {
  console.log('🔧 DEBUG: Hiding all mystery boxes');
  MYSTERY_LOCATIONS.forEach((location) => {
    const boxElement = document.getElementById(location.id);
    if (boxElement) {
      boxElement.setAttribute('visible', 'false');
      console.log(`📦 ${location.id} hidden`);
    }
  });
}

// Make debug functions available globally
window.showAllBoxes = showAllBoxes;
window.hideAllBoxes = hideAllBoxes;

// Make functions available globally for console access
window.enableTestMode = enableTestMode;
window.disableTestMode = disableTestMode;

// On load, hide popup and initialize
window.onload = () => {
  popup.classList.add('hidden');
  
  // Console help message
  console.log('🎮 UWU Mystery AR Hunt loaded!');
  console.log('💡 Debug commands available:');
  console.log('   enableTestMode() - Show yellow test box for AR testing');
  console.log('   disableTestMode() - Hide test box, enable normal game mode');
  console.log('   showAllBoxes() - Force show all mystery boxes (for testing)');
  console.log('   hideAllBoxes() - Hide all mystery boxes');
  console.log('🗺️ Normal mode: Mystery boxes appear when within ' + THRESHOLD_METERS + 'm of target locations');
  console.log('📱 If boxes are "visible" but you can\'t see them, try showAllBoxes() to test AR rendering');
  
  debugCameraAccess();
  initializeAR();
  
  // Start GPS setup after a delay
  setTimeout(setupGPS, 3000);
};

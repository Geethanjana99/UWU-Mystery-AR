// ar.js - AR scene logic for mystery object hunt

// Target coordinates - Main location
const TARGET_LAT = 6.985161867439368;
const TARGET_LON = 81.07362372073608;
const THRESHOLD_METERS = 5; // Show mystery boxes when within 5 meters

// Multiple mystery box locations spread around different areas (100m x 100m range)
const MYSTERY_LOCATIONS = [
  { id: 'mysteryBox1', lat: 6.985161867439368, lon: 81.07362372073608, color: '#FF0000' }, // Red - Central location
  { id: 'mysteryBox2', lat: 6.985261867439368, lon: 81.07412372073608, color: '#00FF00' }, // Green - North (10m north, 50m east)
  { id: 'mysteryBox3', lat: 6.985061867439368, lon: 81.07312372073608, color: '#0000FF' }, // Blue - South (10m south, 50m west)  
  { id: 'mysteryBox4', lat: 6.985211867439368, lon: 81.07312372073608, color: '#FFFF00' }, // Yellow - North-West (5m north, 50m west)
  { id: 'mysteryBox5', lat: 6.985111867439368, lon: 81.07412372073608, color: '#FF00FF' }  // Magenta - South-East (5m south, 50m east)
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

// Debug function to check camera support (without interfering with AR.js)
function debugCameraAccess() {
  console.log('🔍 Checking camera support...');
  console.log('User Agent:', navigator.userAgent);
  console.log('Is mobile:', /Mobi|Android/i.test(navigator.userAgent));
  console.log('Protocol:', window.location.protocol);
  
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error('❌ getUserMedia not supported');
    showError('Your browser does not support camera access. Please use a modern browser.');
    return;
  }

  console.log('✅ Camera API is available - AR.js will handle camera initialization');
  
  // Let AR.js handle camera setup without interference
  initializeARCamera();
}

// Force AR.js camera initialization (simplified)
function initializeARCamera() {
  console.log('🎥 Initializing AR.js camera system...');
  
  const scene = document.querySelector('a-scene');
  if (scene) {
    console.log('📡 AR scene found, letting AR.js handle camera initialization');
    // AR.js will handle camera automatically
  } else {
    console.error('❌ AR scene not found');
  }
  
  // Check video element status after AR.js initializes
  setTimeout(checkVideoElement, 3000);
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
      visible: video.style.display !== 'none'
    });
    
    // Ensure video is visible
    video.style.display = 'block';
    video.style.visibility = 'visible';
    video.style.opacity = '1';
    
    if (video.paused) {
      video.play().catch(e => console.log('Video play attempt:', e.message));
    }
  });
  
  if (videos.length === 0) {
    console.log('❌ No video elements found - camera background may be missing');
    showCameraInfo();
  } else {
    console.log('✅ Video elements found - camera should be working');
  }
}

function showCameraInfo() {
  if (loadingIndicator) {
    loadingIndicator.innerHTML = `
      <div class="spinner"></div>
      <div>AR Camera Initializing...</div>
      <div style="font-size: 14px; margin-top: 10px; opacity: 0.8;">
        Camera may take a moment to appear.<br>
        AR objects should still be visible.<br>
        <span style="color: #ffc107;">Try moving your device or refreshing if needed.</span>
      </div>
      <button onclick="location.reload()" style="margin-top: 15px; padding: 8px 16px; background: #2b7a78; color: white; border: none; border-radius: 4px;">Refresh</button>
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
    
    scene.addEventListener('renderstart', function() {
      if (!renderStarted) {
        renderStarted = true;
        console.log('📷 AR scene render started - camera should be active');
        
        // Check for video after render starts
        setTimeout(checkVideoElement, 1500);
        
        // Hide loading indicator when camera starts rendering
        setTimeout(() => {
          if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
          }
        }, 3000);
      }
    });
    
    scene.addEventListener('loaded', function() {
      console.log('✅ AR scene loaded successfully');
    });
    
    // Listen for AR.js specific events
    scene.addEventListener('arjs-video-loaded', function() {
      console.log('📹 AR.js video loaded successfully');
      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
      }
    });
    
    // Fallback: hide loading indicator after reasonable time
    setTimeout(() => {
      console.log('⏰ Initialization timeout reached');
      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
      }
    }, 8000);
  }
}

// Try to manually create camera background if AR.js fails
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
      
      // Add victory animation before hiding
      boxElement.setAttribute('animation__victory', 'property: scale; from: 1 1 1; to: 2 2 2; dur: 300; easing: easeOutQuad');
      boxElement.setAttribute('animation__spin', 'property: rotation; from: 0 0 0; to: 0 360 0; dur: 600; easing: easeOutQuad');
      boxElement.setAttribute('animation__fade', 'property: material.opacity; from: 1; to: 0; dur: 600; delay: 300; easing: easeInQuad');
      
      // Hide after animation completes
      setTimeout(() => {
        boxElement.setAttribute('visible', 'false');
        boxElement.removeAttribute('animation__victory');
        boxElement.removeAttribute('animation__spin');
        boxElement.removeAttribute('animation__fade');
        // Reset opacity for future visibility
        const boxChild = boxElement.querySelector('a-box');
        if (boxChild) {
          boxChild.setAttribute('material.opacity', '1');
        }
      }, 900);
      
      foundBoxes.add(location.id);
      
      if (popup) {
        popup.classList.remove('hidden');
        setTimeout(() => popup.classList.add('hidden'), 3500);
      }
      
      // Show success notification
      if (userLocation) {
        const dist = getDistanceMeters(userLocation.lat, userLocation.lon, location.lat, location.lon);
        const remaining = MYSTERY_LOCATIONS.length - foundBoxes.size;
        
        if (remaining > 0) {
          showNotification(`🎉 Found ${location.id}! 📍 ${dist.toFixed(1)}m away<br>🎯 ${remaining} more to find!`, 4000, '#00ff00');
        } else {
          showNotification(`🎉 QUEST COMPLETE! All boxes found!<br>🏆 Final box: ${dist.toFixed(1)}m away`, 5000, '#ffc107');
        }
      } else {
        const remaining = MYSTERY_LOCATIONS.length - foundBoxes.size;
        if (remaining > 0) {
          showNotification(`🎉 Found ${location.id}!<br>🎯 ${remaining} more to find!`, 4000, '#00ff00');
        } else {
          showNotification(`🎉 QUEST COMPLETE!<br>🏆 All mystery boxes found!`, 5000, '#ffc107');
        }
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
      
      showNotification(`📦 Test box clicked! Camera working ✅<br>📍 Closest box: ${closestDistance.toFixed(1)}m<br>🎯 Within ${THRESHOLD_METERS}m to find objects<br>📊 Found: ${foundBoxes.size}/${MYSTERY_LOCATIONS.length}`, 5000, '#ffc107');
    } else {
      showNotification(`📦 Test box clicked! Camera working ✅<br>📍 Getting your location...`, 3000, '#ffc107');
    }
  });
}

// Notification system for user feedback
function createNotificationElement() {
  if (document.getElementById('notification')) return; // Already exists
  
  const notification = document.createElement('div');
  notification.id = 'notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(20, 20, 50, 0.9));
    color: white;
    padding: 15px 25px;
    border-radius: 10px;
    font-family: Arial, sans-serif;
    font-size: 16px;
    z-index: 1001;
    display: none;
    border: 2px solid #ffc107;
    box-shadow: 0 0 20px rgba(255, 193, 7, 0.5);
    max-width: 90%;
    text-align: center;
  `;
  document.body.appendChild(notification);
}

function showNotification(message, duration = 3000, color = '#ffc107') {
  createNotificationElement();
  const notification = document.getElementById('notification');
  
  notification.innerHTML = message;
  notification.style.borderColor = color;
  notification.style.boxShadow = `0 0 20px ${color}50`;
  notification.style.display = 'block';
  notification.style.animation = 'notificationSlideIn 0.5s ease-out';
  
  setTimeout(() => {
    notification.style.animation = 'notificationSlideOut 0.5s ease-in';
    setTimeout(() => {
      notification.style.display = 'none';
    }, 500);
  }, duration);
}

// Add notification animations to CSS
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
  @keyframes notificationSlideIn {
    from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
    to { transform: translateX(-50%) translateY(0); opacity: 1; }
  }
  @keyframes notificationSlideOut {
    from { transform: translateX(-50%) translateY(0); opacity: 1; }
    to { transform: translateX(-50%) translateY(-100%); opacity: 0; }
  }
`;
document.head.appendChild(notificationStyles);

// Debug functions for showing/hiding all boxes
function showAllBoxes() {
  console.log('🔧 DEBUG: Showing all mystery boxes regardless of distance');
  MYSTERY_LOCATIONS.forEach((location) => {
    const boxElement = document.getElementById(location.id);
    if (boxElement && !foundBoxes.has(location.id)) {
      boxElement.setAttribute('visible', 'true');
      // Add entrance animation
      boxElement.setAttribute('animation__debug_appear', 'property: scale; from: 0 0 0; to: 1 1 1; dur: 1000; easing: easeOutBounce');
      setTimeout(() => {
        boxElement.removeAttribute('animation__debug_appear');
      }, 1000);
    }
  });
  
  // Hide test box in debug mode
  if (testBox) {
    testBox.setAttribute('visible', 'false');
  }
  
  console.log('💡 Use hideAllBoxes() to hide them again');
}

function hideAllBoxes() {
  console.log('🔧 DEBUG: Hiding all mystery boxes');
  MYSTERY_LOCATIONS.forEach((location) => {
    const boxElement = document.getElementById(location.id);
    if (boxElement) {
      // Add exit animation
      boxElement.setAttribute('animation__debug_disappear', 'property: scale; from: 1 1 1; to: 0 0 0; dur: 500; easing: easeInQuad');
      setTimeout(() => {
        boxElement.setAttribute('visible', 'false');
        boxElement.removeAttribute('animation__debug_disappear');
      }, 500);
    }
  });
  
  console.log('💡 Use showAllBoxes() to show them again');
}

// Make functions available globally for console access
window.enableTestMode = enableTestMode;
window.disableTestMode = disableTestMode;
window.showAllBoxes = showAllBoxes;
window.hideAllBoxes = hideAllBoxes;

// On load, hide popup and initialize
window.onload = () => {
  popup.classList.add('hidden');
  
  // Console help message
  console.log('🎮 UWU Mystery AR Hunt loaded!');
  console.log('💡 Debug commands available:');
  console.log('   enableTestMode() - Show yellow test box for AR testing');
  console.log('   disableTestMode() - Hide test box, enable normal game mode');
  console.log('   showAllBoxes() - Show all mystery boxes regardless of distance');
  console.log('   hideAllBoxes() - Hide all mystery boxes');
  console.log('🗺️ Normal mode: Mystery boxes appear when within ' + THRESHOLD_METERS + 'm of target locations');
  
  debugCameraAccess();
  initializeAR();
  
  // Start GPS setup after a delay
  setTimeout(setupGPS, 3000);
};

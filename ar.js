// ar.js - AR scene logic for mystery object hunt

// Target coordinates
const TARGET_LAT = 6.985462148939262;
const TARGET_LON = 81.0734485580701;
const THRESHOLD_METERS = 25; // Show object if within 25 meters

const box = document.getElementById('mysteryBox');
const popup = document.getElementById('popup');

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

// On load, hide popup
window.onload = () => {
  popup.classList.add('hidden');
};

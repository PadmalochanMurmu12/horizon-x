module.exports = {
  MIN_CONNECTION_MINUTES: 45, // Anything less is a missed flight
  MAX_CONNECTION_MINUTES: 360, // Nobody wants a layover longer than 6 hours for domestic
  MAX_RESULTS_PER_LEG: 40 // Our server-side Top-N cap
};
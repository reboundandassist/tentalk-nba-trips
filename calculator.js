/* Fixed HKD planning assumptions; update prices here, never from live services. */
const TRIP_PRICES = Object.freeze({
  airfare: 10000, domestic: { region: 2000, coast: 2000, cross: 3000 },
  hotelNight: 1500, nightsPerGame: 2, majorMultiplier: 1.2, daily: 800,
  tickets: { mountain: [1500, 2000], tentalk: [2500, 3000], lower: [3500, 4000] },
  rounds: [1, 1.25, 1.5, 2], range: 0.1,
});
function calculateTrip(input) {
  const { games, stars, cities, major, travel, round, seat, occupants } = input;
  if (![games, stars, cities, major, round, occupants].every(Number.isInteger) ||
      games < 1 || games > 5 || stars < 0 || stars > games || cities < 1 || cities > games ||
      major < 0 || major > cities || round < 0 || round > 3 || ![1, 2].includes(occupants) ||
      !Object.hasOwn(TRIP_PRICES.domestic, travel) || !Object.hasOwn(TRIP_PRICES.tickets, seat)) {
    throw new RangeError('Invalid trip selections');
  }
  const nights = games * TRIP_PRICES.nightsPerGame;
  const days = nights + 1;
  // Allocate nights and ticket city premiums proportionally; do not round intermediate values.
  const cityMultiplier = 1 + (TRIP_PRICES.majorMultiplier - 1) * major / cities;
  const [generalTicket, starTicket] = TRIP_PRICES.tickets[seat];
  const categories = {
    airfare: TRIP_PRICES.airfare,
    domestic: cities * TRIP_PRICES.domestic[travel], // Includes the assumed return to the gateway.
    hotel: nights * TRIP_PRICES.hotelNight * cityMultiplier / occupants,
    tickets: (stars * starTicket + (games - stars) * generalTicket) * cityMultiplier * TRIP_PRICES.rounds[round],
    local: days * TRIP_PRICES.daily,
  };
  const total = Object.values(categories).reduce((sum, cost) => sum + cost, 0);
  const round500 = (value) => Math.round(value / 500) * 500;
  return { categories, total, lower: round500(total * (1 - TRIP_PRICES.range)),
    upper: round500(total * (1 + TRIP_PRICES.range)), nights, days, legs: cities };
}
if (typeof module !== 'undefined') module.exports = { TRIP_PRICES, calculateTrip };

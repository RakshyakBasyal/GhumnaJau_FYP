const DAY_MS = 24 * 60 * 60 * 1000;

function getEffectiveTravelDate(booking) {
  if (!booking) return null;
  if (booking.type === 'hotel' && booking.checkIn) return new Date(booking.checkIn);
  if (booking.type === 'flight' && booking.flight?.departureDate) return new Date(booking.flight.departureDate);
  return null;
}

function getRefundPercent(daysBeforeStart) {
  if (daysBeforeStart >= 7) return 100;
  if (daysBeforeStart >= 3) return 90;
  if (daysBeforeStart >= 1) return 70;
  return 30;
}

function calculateRefundPolicy(booking) {
  const travelDate = getEffectiveTravelDate(booking);
  if (!travelDate || Number.isNaN(travelDate.getTime())) {
    return { refundPercent: 0, daysBeforeStart: null };
  }

  const now = new Date();
  const daysBeforeStart = (travelDate.getTime() - now.getTime()) / DAY_MS;
  return {
    refundPercent: getRefundPercent(daysBeforeStart),
    daysBeforeStart,
  };
}

function calculateRefundAmount(totalAmount, refundPercent) {
  const amount = (Number(totalAmount) || 0) * ((Number(refundPercent) || 0) / 100);
  return Math.max(0, Number(amount.toFixed(2)));
}

module.exports = {
  calculateRefundPolicy,
  calculateRefundAmount,
};

// backend/src/utils/refundPolicy.js
const DAY_MS = 24 * 60 * 60 * 1000;

function getEffectiveTravelDate(booking) {
  if (!booking) return null;

  if (booking.type === 'hotel' && booking.checkIn)
    return new Date(booking.checkIn);

  if (booking.type === 'flight' && booking.flight?.departureDate)
    return new Date(booking.flight.departureDate);

  if (booking.type === 'activity' && booking.activityDate)
    return new Date(booking.activityDate);

  // Trip plan — use earliest date across all items
  if (booking.type === 'trip_plan' && booking.tripPlanItems?.length > 0) {
    const dates = booking.tripPlanItems
      .map(item => {
        if (item.type === 'hotel'  && item.checkIn)      return new Date(item.checkIn);
        if (item.type === 'flight' && item.flight?.departureDate) return new Date(item.flight.departureDate);
        if (item.type === 'activity' && item.activityDate) return new Date(item.activityDate);
        return null;
      })
      .filter(d => d && !Number.isNaN(d.getTime()));
    if (dates.length > 0) return new Date(Math.min(...dates.map(d => d.getTime())));
  }

  // Reservation — use the reservation date
  if (booking.type === 'reservation' && booking.reservationDate)
    return new Date(booking.reservationDate);

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
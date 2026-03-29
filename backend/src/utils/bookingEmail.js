const transporter = require('../config/mailer');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const SUPPORT_URL = process.env.SUPPORT_URL || `${FRONTEND_URL}/contact`;

const fmtDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const fmtMoney = (amount) => `NPR ${(Number(amount) || 0).toLocaleString()}`;

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getDetailsRows = (booking) => {
  if (booking.type === 'hotel') {
    return [
      ['Hotel', booking.hotel?.name || 'N/A'],
      ['Destination', booking.hotel?.destination?.name || booking.hotel?.country || 'N/A'],
      ['Check-in', fmtDate(booking.checkIn)],
      ['Check-out', fmtDate(booking.checkOut)],
      ['Guests', booking.guests ?? 'N/A'],
    ];
  }

  const pax = booking.passengersCount || {};
  const totalPax = (pax.adults || 0) + (pax.children || 0) + (pax.infants || 0);
  return [
    ['Flight', [booking.flight?.airline, booking.flight?.flightNumber].filter(Boolean).join(' ') || 'N/A'],
    ['Route', booking.flight ? `${booking.flight.from} -> ${booking.flight.to}` : 'N/A'],
    ['Departure date', fmtDate(booking.flight?.departureDate)],
    ['Departure / Arrival', booking.flight ? `${booking.flight.departureTime} / ${booking.flight.arrivalTime}` : 'N/A'],
    ['Passengers', totalPax || 'N/A'],
  ];
};

const buildHtml = ({ booking, recipientName, triggerSource }) => {
  const typeLabel = booking.type === 'hotel' ? 'Hotel' : 'Flight';
  const amountPaid =
    booking.paymentStatus === 'completed' || booking.paymentStatus === 'refunded'
      ? booking.totalAmount
      : 0;
  const detailsRows = getDetailsRows(booking)
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 0;color:#6b7280;font-size:13px;">${escapeHtml(label)}</td>
          <td style="padding:10px 0;color:#111827;font-size:13px;font-weight:600;text-align:right;">${escapeHtml(value)}</td>
        </tr>
      `
    )
    .join('');

  return `
    <div style="background:#f3f7ff;padding:28px 12px;font-family:Inter,Segoe UI,Arial,sans-serif;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="background:linear-gradient(120deg,#1d4ed8,#3b82f6);padding:24px 26px;color:#ffffff;">
          <div style="font-size:13px;opacity:0.9;letter-spacing:0.3px;">Ghumna Jau</div>
          <h2 style="margin:8px 0 0;font-size:24px;line-height:1.2;">Booking Confirmed</h2>
          <p style="margin:8px 0 0;font-size:13px;opacity:0.95;">
            Your ${escapeHtml(typeLabel.toLowerCase())} booking receipt is ready.
          </p>
        </div>

        <div style="padding:22px 26px;">
          <p style="margin:0 0 14px;color:#111827;font-size:14px;">
            Hi ${escapeHtml(recipientName || 'Traveler')}, your booking has been confirmed (${escapeHtml(triggerSource)}).
          </p>

          <div style="border:1px dashed #d1d5db;border-radius:14px;padding:16px 18px;background:#fafcff;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:0 0 10px;color:#6b7280;font-size:13px;">Booking ID</td>
                <td style="padding:0 0 10px;color:#111827;font-size:13px;font-weight:700;text-align:right;">${escapeHtml(booking._id)}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;color:#6b7280;font-size:13px;">Booking Type</td>
                <td style="padding:10px 0;color:#111827;font-size:13px;font-weight:600;text-align:right;">${escapeHtml(typeLabel)}</td>
              </tr>
              ${detailsRows}
              <tr>
                <td style="padding:10px 0;color:#6b7280;font-size:13px;">Total amount paid</td>
                <td style="padding:10px 0;color:#16a34a;font-size:15px;font-weight:800;text-align:right;">${escapeHtml(fmtMoney(amountPaid))}</td>
              </tr>
            </table>
          </div>

          <div style="margin-top:18px;padding:14px;border-radius:12px;background:#eff6ff;color:#1e3a8a;font-size:13px;">
            Need help? Contact support:
            <a href="${escapeHtml(SUPPORT_URL)}" style="color:#1d4ed8;font-weight:700;text-decoration:none;">${escapeHtml(SUPPORT_URL)}</a>
          </div>

          <p style="margin:18px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
            This is an automated confirmation email from Ghumna Jau. Please keep it for your records.
          </p>
        </div>
      </div>
    </div>
  `;
};

async function sendBookingConfirmationEmail({ booking, source }) {
  if (!booking?.user?.email) return;

  const triggerSource = source === 'admin' ? 'admin confirmation' : 'payment confirmation';
  const subjectPrefix = booking.type === 'hotel' ? 'Hotel' : 'Flight';

  await transporter.sendMail({
    from: `"Ghumna Jau" <${process.env.GMAIL_USER}>`,
    to: booking.user.email,
    subject: `${subjectPrefix} Booking Confirmed - ${booking._id}`,
    html: buildHtml({
      booking,
      recipientName: booking.user.fullName,
      triggerSource,
    }),
  });
}

module.exports = {
  sendBookingConfirmationEmail,
};

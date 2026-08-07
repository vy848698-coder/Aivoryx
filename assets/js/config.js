/* ============================================================
   AIVORYX — single source of truth for contact details.
   Change these three values and the whole site follows:
   nav, hero, contact cards, footer, floating button, WhatsApp form.
   ============================================================ */
window.AX = window.AX || {};

window.AX.config = {
  /* WhatsApp number in international format, digits only (no + or spaces) */
  whatsapp: '910000000000',

  /* Phone: the dial value and the way it is shown on screen */
  phone: '+910000000000',
  phoneDisplay: '+91 00000 00000',

  email: 'hello@aivoryx.com',

  /* Prefilled first line when someone taps WhatsApp */
  waGreeting: "Hi Aivoryx, I'd like to discuss a project",

  /* Booking link — leave empty to keep the "Book a call" card scrolling to the form */
  bookingUrl: ''
};

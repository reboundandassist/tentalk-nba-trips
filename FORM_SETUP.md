# Future-interest intake: owner setup required

The frontend is ready but intentionally cannot submit until a real Formspree form ID is configured. The previous Google Form is not reused: its field mapping does not match the new consent, message and future-interest fields, and iframe loading cannot establish acceptance.

## Proposed service and cost

Formspree Free: 50 submissions/month, 30-day submission archive, AJAX submissions, private notification recipient and basic spam filtering. No subscription has been created or purchased. Confirm current limits at https://formspree.io/plans before activating. Exceeding quota may cause rejected submissions; the site shows an error, never a fabricated success.

## Activation

1. Owner creates a free Formspree account and new form. Configure and verify the administrator address specified in the original enhancement brief privately in the dashboard. Never put that address, passwords or service secrets in this repository.
2. Enable Formshield basic spam filtering and restrict submissions to the live GitHub Pages hostname where supported. The frontend also checks an empty honeypot; this is supplemental and does not replace server-side filtering. Confirm AJAX submissions work with the chosen CAPTCHA settings; do not disable server protection merely to bypass a challenge.
3. Set `window.TENTALK_FORM_ENDPOINT` in `form-config.js` to the supplied `https://formspree.io/f/FORM_ID`. This public submission ID is not an administrator email or secret.
4. Submit one owner-authorized test on the deployed website. Confirm the private notification includes name, email, message, future_interest, consent and submitted_at. The browser timestamp is informational; service receipt time is authoritative. Confirm receipt in the dashboard and inbox, including spam folder.
5. Verify invalid consent, provider rejection, network failure and accidental double-click handling. The local browser suite mocks the provider; it does not verify actual email delivery.

## Privacy and request handling

Formspree processes submitted personal data; review https://formspree.io/legal/privacy-policy/ and its subprocessors before activation. Disclose the processor in the form (already included). Dashboard archive limits do not delete notification emails or owner copies. Choose a retention period before collecting data and delete data when no longer needed.

Visitors can request correction, deletion or cessation of communications via the linked TenTalk Instagram account or by replying to a later email. Confirm that linked account is monitored before launch. Verify request ownership privately; correct/delete matching submissions, inbox messages and any owner-held list; cease future communications. Do not repurpose the old Google Form responses or migrate them without checking their consent.

In-flight submissions disable the button; confirmed success locks it for the current page session. No personal data is saved in browser storage. A timeout is inherently ambiguous, so the error warns against resubmission if already confirmed. Cross-session idempotency is not provided by this frontend or claimed; provider-side spam protection remains essential.

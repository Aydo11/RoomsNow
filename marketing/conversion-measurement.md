# Completed-action measurement

GA4 property 555728057, web stream 15838886213, measurement ID G-V2RLYZNG3S.

- `sign_up`: emitted after account creation and session creation succeed. Not emitted for logins, opening `/register`, validation errors, duplicate accounts or email confirmation.
- `generate_lead`: emitted after a new accommodation request or first message to a provider succeeds, for USER/REFERRER accounts. Repeat threads, provider outreach and a request following an existing advert conversation do not emit a second lead. Different genuinely new enquiries may be counted separately in Analytics; Google Ads should count one per ad interaction.
- WhatsApp button clicks remain a separate first-party contact metric, not a confirmed enquiry or tenancy.
- No placement, eligibility decision, property, provider, support category, message text, account ID or personal contact information is sent with these events.

Consent is mirrored from the existing optional-cookie choice into `rn_analytics_choice`. A successful server action records a signed, HttpOnly receipt cookie with a five-minute lifetime only when optional cookies are accepted. The next navigation loads an empty same-origin document. The document verifies consent again and deduplicates receipts in session storage, then sends only the generic event name and the site's root URL to GA4. Receipt IDs stay in the browser. The relay has a narrowly scoped frame policy; account pages retain their existing DENY policy. Ad storage, user data, ad personalisation and Google signals remain disabled.

Browser privacy tools, blocked tags, withdrawn consent or network failures can prevent measurement. Counts are consented measured outcomes, not a complete database count. Analytics failure must never prevent account creation or contacting a provider. Do not invent a monetary value or label a page view as a successful lead.

Validation: 159 regression tests passed; focused token, consent, privacy, deduplication and relay request tests passed; production build and type check passed. Real local HTTP checks confirm the relay's headers, static script, and retained private-page framing protection. The local fixture never executed tracking scripts or sent fake conversions to Google.

For bidding: use successful enquiries as the primary conversion and completed registrations as secondary measurement, with obsolete registration-page goals excluded from optimisation. Verify real consented activity after release before raising the budget. Retain national coverage and the existing budget until measurement and lead quality can be assessed.

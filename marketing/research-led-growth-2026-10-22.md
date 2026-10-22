# RoomsNow: research-led acquisition and retention

Reviewed 22 October 2026. Budget authorised: Google Ads average £15/day across active campaigns. No additional Meta, TikTok or influencer spend authorised by this review.

## What comparable platforms demonstrate

These are observed product patterns, not evidence of competitors' conversion rates, acquisition costs or advertising profitability. Their self-published testimonials and scale claims are not independent performance evidence.

| Source | Observed pattern | RoomsNow application |
| --- | --- | --- |
| [SpareRoom FAQ](https://www.spareroom.co.uk/content/info-faq/faq) | People browse before registering; registration unlocks contact. | Keep browsing open and make the reason to join explicit at search and contact points. |
| [SpareRoom email alerts](https://www.spareroom.co.uk/content/info-faq/why-email-alerts/) | Matching alerts provide a reason to return. | Promote existing saved searches without automatically subscribing anyone. |
| [OpenRent tenant journey](https://www.openrent.co.uk/find-property-to-rent-from-private-landlords) | Search filters, room details and direct landlord contact are prominent. | Emphasise photos, costs, availability and provider messaging; do not copy OpenRent's tenancy/deposit promises. |
| [RoomMatch](https://roommatch.co.uk/about-us) | Supported-housing discovery includes professional referral audiences. | Develop a separate referrer distribution route, using RoomsNow's existing referral page. |
| [Signpost for referrers](https://www.signpostportal.com/for-referrers) | Area and needs filtering leads to direct provider contact; the provider confirms suitability. | Explain provider confirmation clearly and avoid implying guaranteed accommodation or council endorsement. |
| [Google's learning guidance](https://support.google.com/google-ads/answer/13020501?hl=en) | Learning depends on conversion volume, conversion delay and changes to campaign composition. | Establish a baseline before expanding placements or repeatedly changing bids. A fixed number of days does not guarantee enough evidence. |

## Applied website improvements in this branch

- Search signup now carries the actual filters and map/list view through registration and sign-in, returning to the room-alert controls.
- Only recognised search parameters are retained; advertising IDs and arbitrary query parameters are not copied into the return destination.
- The signup invitation explains existing account benefits: save rooms, message providers and choose new-room alerts. Browsing remains open.
- Registration explains that the room-seeker account is free and starts with email and password. Professional account requirements are unchanged.
- The public how-it-works journey now starts with browsing and accurately describes the shorter signup flow.

## Current advertising baseline

Completed in the signed-in Google Ads account before this research:

- Enabled: **RoomsNow | UK Search | Signups & Enquiries**, campaign **24380726607**.
- Paused until manually resumed: **RoomsNow | UK Room Enquiries**, campaign **24278410251**.
- Active total average daily budget: **£15**; Maximise conversions; UK presence targeting.
- Primary outcomes: **RoomsNow | Account created** (`sign_up`) and **RoomsNow | Enquiry completed** (`generate_lead`), each counted once per ad interaction.
- Earlier registration-page actions remain secondary; page views and generic contact/call categories are excluded from account-default goals.
- Google Search only initially; phrase-match intent keywords; Search partners, Display expansion and AI Max off.
- 12 responsive-ad headlines, four descriptions, four sitelinks, four callouts and tagged ad URLs.
- Eleven negative phrase keywords exclude employment, property-sales, investment, licensing/training and holiday intent.

The new campaign was shown as Eligible (Learning), not proven profitable. True outcome tracking was only released today. Confirm real consented successful actions arrive before interpreting zeros as a lack of real enquiries. Do not send fake registrations or housing messages to manufacture conversion data.

## Measurement and decision rules

Use completed days and the same date range when comparing platforms. Keep Google Ads clicks, GA4 users/sessions, database registrations and provider enquiries distinct.

1. Check true `sign_up` and `generate_lead` collection and ad attribution. GA4's older aggregate key-event total is not a count of verified registrations.
2. Investigate GA4's heavy Direct attribution and missing Organic Search channel despite Search Console clicks. Consent, redirects and referrer handling are hypotheses to test, not established causes. Do not remove consent protections.
3. Report spend, completed signups, completed enquiries, cost per signup and cost per enquiry separately. Do not sum signup and enquiry counts and describe the result as unique people.
4. Assess enquiry relevance and provider replies from the platform; a conversion event alone does not prove a viewing or placement. Historical admin traffic inflates page engagement and should not be treated as seeker activity.
5. Check search terms for irrelevant spend. Expand only where the landing page has a useful journey or relevant inventory. UK-wide visibility does not mean every area currently has rooms.
6. After sufficient reliable outcome data, test **one** reach change, starting with Search partners if appropriate. Keep spend at £15/day and compare qualified-outcome costs. Do not promise a conversion uplift or treat clicks as the winning metric.

Set the affordable cost per genuine enquiry from business economics. No defensible target CPA or lead forecast can be inferred from competitors' public websites.

## Distribution programme

### Room seekers

- Feature genuine current room photos and area-specific details. Link to the specific live advert; recheck before each post.
- Rotate practical content: how to compare costs, what to ask at a viewing, how saved alerts work, and how to contact a provider.
- Existing Facebook schedule: at most two verified new-listing posts/day, 14-day no-repeat window. Page access and photo reuse must be verified. No unsolicited group comments or new paid boosts.
- Use the existing TikTok room video with a destination matching its rooms/area. New paid platforms or creators need a defined allocation; do not add their spend on top of Google automatically.

### Professional referrers

- Offer councils, housing teams, charities and resettlement/support organisations a short demonstration of searching vacancies and contacting providers.
- Use the existing professional referral landing page, with a distinct explanation of the professional account.
- Start with organisations serving areas with live stock. Seek useful feedback and repeat use, not just mailing volume.
- Say RoomsNow is inviting organisations to use the platform. Do not imply BCC, BVSC or any council endorses, partners with or routinely uses it unless specifically confirmed.

### Providers

- Encourage current photos, accurate costs, clear referral routes, confirmed availability and timely replies.
- Give providers tagged links they can share with their existing referrers and audience.
- Promote verification only as actually defined on RoomsNow; do not imply that identity checks guarantee quality or suitability.

## Ready-to-use tagged links

Use `utm_source` consistently. For room-specific content replace the pathname with the checked live advert URL before posting.

- Organic Facebook room discovery: `https://www.roomsnow.co.uk/search?utm_source=facebook&utm_medium=organic_social&utm_campaign=room_discovery`
- Organic TikTok room discovery: `https://www.roomsnow.co.uk/search?utm_source=tiktok&utm_medium=organic_social&utm_campaign=room_discovery`
- Organisation email: `https://www.roomsnow.co.uk/accommodation-referrals?utm_source=organisation_outreach&utm_medium=email&utm_campaign=referrer_onboarding`
- Provider sharing: `https://www.roomsnow.co.uk/search?utm_source=provider_share&utm_medium=referral&utm_campaign=room_discovery`

## Suggested outreach copy — prepared, not sent

**Subject:** A simpler way for your team to find accommodation vacancies

Hello,

I’m Ayden, founder of RoomsNow. We help people and professional referrers search accommodation adverts by area, room details and support needs, then contact the provider directly.

We’re inviting housing and support organisations to try the platform and tell us what would make it useful in their day-to-day work. Providers confirm current availability, costs and suitability; RoomsNow does not make placement decisions.

Would a short demonstration be useful for your team? You can explore the professional referral page here:

https://www.roomsnow.co.uk/accommodation-referrals?utm_source=organisation_outreach&utm_medium=email&utm_campaign=referrer_onboarding

If another colleague handles accommodation sourcing, I’d appreciate being pointed in the right direction.

Kind regards,
Ayden
RoomsNow

## Review sequence

- **Now:** deploy the search-return and account-benefit improvements after validation; preserve the new campaign baseline.
- **First genuine actions:** verify outcome collection and compare consented analytics with platform records without exposing personal data to ad tools.
- **29 October:** initial delivery and search-term review, using completed data and allowing for conversion delay. Low volume is not proof of failure or a reason to reset everything.
- **5 November:** assess cost per successful signup/enquiry and provider responses; decide whether a controlled placement test is justified. Continue collecting data if volume is insufficient.

These are review dates, not new scheduled automations. This document does not assert that outreach, social posts or later placement tests have been carried out.

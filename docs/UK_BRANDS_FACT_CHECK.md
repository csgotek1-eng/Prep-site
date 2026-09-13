# /uk-brands — what was published, and what was not

The owner's §4.2 draft led with a price comparison:

> "Your parcel costs €10 to cross the Irish Sea. Ours costs €4.55."

Every numeric claim in it was checked against primary sources before a
line of the page was written. Two of them did not survive.

## The draft's numbers

| Claim | Verdict | What the sources actually say |
| --- | --- | --- |
| ~€10 to send a parcel GB → IE | **UNVERIFIABLE** | Royal Mail, Parcelforce and Evri return HTTP 403 to automated requests; DPD UK and UPS publish consumer prices only behind a JavaScript quote form. No carrier tariff could be read. The one GB→IE consumer figure that could be verified is DHL Service Point at £32.95 for a box up to 1.9 kg — nothing like €10, and one carrier is not a market. |
| ~€4.55 to send a parcel within Ireland | **NOT A RATE** | It appears in no An Post band, current or historic. Effective 3 Feb 2026: parcel up to 2 kg **€9.00**; the €4.40 figure is a 100 g **packet**, a different product. GLS starts at €8.00 by size. |
| ~€3 customs/handling charge | **CONFLATES TWO THINGS** | The €3 is a customs **duty**. An Post's **handling** fee is **€6.95**. |
| €150 threshold | **VERIFIED, but it is a DUTY threshold** | Never a VAT threshold. VAT has been due on everything since the €22 relief ended in 2021. |

**Consequence for the argument.** Like for like, the honest comparison
is roughly €9.00 domestic against an unverifiable GB→IE figure. The
price-arbitrage story the draft told does not survive its own numbers,
so the page does not tell it.

## What the page says instead

Customs friction, which is documented, current, and much harder to
argue with. Every claim on the page is sourced in the markup:

- an import declaration on every consignment, any value (since 1 Jul 2021)
- €3 customs duty per item on B2C distance sales, since 1 Jul 2026,
  under Council Regulation (EU) 2026/382, running until 1 Jul 2028
- the €3 is inside the value VAT is calculated on
- Irish VAT at 23% on everything; the €22 relief is gone
- An Post's €6.95 customs administration fee (effective 3 Feb 2026),
  and no delivery until charges are paid
- IOSS requires a non-EU seller to appoint an EU-established intermediary
- An Post publishes that missing customs data causes "Customs delays or
  returns", and that its delivery guarantee excludes customs intervention
- Revenue publishes that a missing entry declaration before goods leave
  GB leads to delays
- duty and VAT may not be refunded on a return

Sources: Irish Revenue, the European Commission, An Post. Verified
11 September 2026.

## Deliberate omissions

- **No carrier prices at all**, in either direction. Half the
  comparison is unverifiable, so the whole comparison is out.
- **No worked example.** The €3 rules are ten weeks old and the
  preference/H1/H7 interaction is intricate; the page states the rules
  and says plainly that it is not customs advice.
- **No delivery-time comparison.** GB→IE transit times could not be
  verified from any carrier.

## Geo visibility

The `/uk-brands` page redirects a visitor the host positively identifies as IE
away from `/uk-brands`. GB, everywhere else, and **anyone whose country
cannot be determined** see the page. The fallback is deliberate: a
missing header must never block a real visitor, and this is
presentation, not access control — there is nothing private on the page
and a VPN defeats it in one click.

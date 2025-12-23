# HUD-42 - Eurosender API Fejlanalyse og Løsning

**Date:** 2025-12-20  
**Status:** Analyse Complete - Ready for Implementation

---

## Fejlanalyse fra Terminal Output

### Fejl 1: pickupContact og deliveryContact sendes stadig (Linje 529-577)
**Fejlbesked:** `Extra attributes are not allowed ("pickupContact", "deliveryContact" are unknown).`

**Problem:** 
- Vi prøver at fjerne `pickupContact` og `deliveryContact` fra request body
- Men de sendes stadig til API'en
- Dette betyder at vores destructuring ikke virker korrekt, eller at de bliver tilføjet igen et sted

**Root Cause:** 
- `createOrder` metoden i `EurosenderService` fjerner contacts, men de bliver måske sendt fra `ShippingLabelService` alligevel
- Eller request body'en bliver ikke korrekt serialiseret

---

### Fejl 2: orderContact er null (Linje 699-752)
**Fejlbesked:** `orderContact: This value should not be null.`

**Problem:**
- Vi tilføjer `orderContact: pickupContact` til request body
- Men `pickupContact` er null eller undefined
- Dette betyder at `pickupContact` ikke bliver sendt korrekt fra frontend

**Root Cause:**
- `ShippingLabelGenerator` sender `pickupContact` og `deliveryContact` i request body
- Men disse bliver fjernet i `EurosenderService.createOrder`
- Når vi prøver at bruge `pickupContact` som `orderContact`, er den null

---

### Fejl 3: Country code er ikke valid (Linje 706)
**Fejlbesked:** `shipment.deliveryAddress.country: This value is not a valid country. Valid ISO 3166-1 alpha-2 (two letter) code expected.`

**Problem:**
- Country code sendes ikke som uppercase
- Eller country code er ikke en valid ISO-2 code (fx "pt" i stedet for "PT")
- Eller country code er ikke 2 karakterer

**Root Cause:**
- `shipping_addresses` tabellen gemmer country codes som lowercase ("pt")
- Vi normaliserer til uppercase i `ShippingLabelService`, men måske ikke i `ShippingLabelGenerator`
- Eller normalization sker ikke før API kaldet

---

### Fejl 4: paymentMethod "deferred" er ikke tilladt (Linje 850-901)
**Fejlbesked:** `paymentMethod: Selected payment method is not appropriate`

**Problem:**
- "deferred" payment method er ikke tilladt i sandbox mode
- Eller kræver specifik kontoopsætning hos Eurosender

**Root Cause:**
- Vi bruger "deferred" som default payment method
- Men i sandbox mode skal vi bruge "credit" (brugerkredit på vores konto)
- "deferred" kræver fakturering setup hos Eurosender (ikke relevant for sandbox)

---

## Eurosender API Dokumentation Analyse

### Payment Methods

Fra research dokumentation:
- **"credit"**: Brugerkredit (forudbetalt kredit på Eurosender konto)
- **"deferred"**: Fakturering efter forsendelsens gennemførelse

**For Huddle's use case:**
- Vi opkræver køber direkte
- Vi skal have en Eurosender Business konto med kredit
- Vi betaler Eurosender fra vores konto (credit method)
- Kunden betaler os, ikke Eurosender

**Konklusion:** Vi skal bruge `paymentMethod: "credit"` i stedet for `"deferred"`

---

### Request Body Format

Fra fejlbeskederne kan vi se:
1. `pickupContact` og `deliveryContact` skal IKKE være på top-niveau
2. `orderContact` skal være på top-niveau (required)
3. Contacts skal være i `shipment` objektet eller som `orderContact`

**Korrekt format (baseret på fejlbeskeder):**
```json
{
  "shipment": {
    "pickupAddress": { ... },
    "deliveryAddress": { ... }
  },
  "parcels": { ... },
  "serviceType": "flexi",
  "paymentMethod": "credit",  // IKKE "deferred" i sandbox
  "orderContact": {           // Required - bruger pickupContact
    "name": "...",
    "phone": "...",
    "email": "..."
  },
  "labelFormat": "pdf"
}
```

**IKKE tilladt:**
- `pickupContact` på top-niveau
- `deliveryContact` på top-niveau
- `paymentMethod: "deferred"` i sandbox mode (kræver fakturering setup)

---

## Sandbox Mode og Payment Flow

### Huddle's Payment Flow

1. **Køber betaler Huddle:**
   - Køber betaler shipping cost til Huddle (via Stripe/Medusa)
   - Huddle modtager betalingen

2. **Huddle betaler Eurosender:**
   - Huddle har en Eurosender Business konto med kredit
   - Når label genereres, trækkes beløbet fra Huddle's kredit
   - Kunden betaler IKKE direkte til Eurosender

3. **Sandbox Mode:**
   - I sandbox mode skal vi bruge `paymentMethod: "credit"`
   - Sandbox kontoen skal have kredit (kan sættes i dashboard)
   - "deferred" kræver fakturering setup (ikke relevant for sandbox)

---

## Løsningsplan

### 1. Fix Request Body Format
- Fjern `pickupContact` og `deliveryContact` fra top-niveau
- Tilføj `orderContact` (bruger pickupContact data)
- Sørg for at contacts ikke sendes to steder

### 2. Fix Country Code Normalization
- Normaliser country codes til uppercase FØR API kald
- Valider at country codes er 2 karakterer
- Tjek at normalization sker i både `ShippingLabelService` og `ShippingLabelGenerator`

### 3. Fix Payment Method
- Skift fra `"deferred"` til `"credit"` som default
- Dette kræver at Huddle har en Eurosender Business konto med kredit
- I sandbox mode kan kredit sættes i dashboard

### 4. Verify orderContact Data
- Sørg for at `pickupContact` data sendes korrekt fra frontend
- Valider at alle required felter (name, phone, email) er tilstede
- Hvis pickupContact mangler, throw error med klar besked

---

## Implementation Checklist

- [ ] Opdater `EurosenderService.createOrder` til at fjerne contacts korrekt
- [ ] Tilføj `orderContact` med pickupContact data (valider at den ikke er null)
- [ ] Normaliser country codes til uppercase i både service og component
- [ ] Skift default paymentMethod fra "deferred" til "credit"
- [ ] Valider at pickupContact har alle required felter før API kald
- [ ] Test i sandbox mode med kredit på kontoen

---

## Eurosender Business Konto Setup

**For sandbox mode:**
1. Opret Business konto hos Eurosender
2. Få API key fra dashboard
3. Sæt kredit på sandbox kontoen (via dashboard)
4. Test med `paymentMethod: "credit"`

**For production:**
1. Opret Production Business konto
2. Få Production API key
3. Sæt kredit på production kontoen
4. Monitor kredit balance
5. Auto-refill kredit når balance er lav

---

## Next Steps

1. **Først:** Fix alle request body fejl (contacts, orderContact, country codes)
2. **Derefter:** Skift paymentMethod til "credit"
3. **Til sidst:** Test i sandbox med kredit på kontoen



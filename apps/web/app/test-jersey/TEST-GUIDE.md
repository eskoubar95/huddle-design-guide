# Jersey Components - Manual Test Guide

## Test Side URL
**http://localhost:3000/test-jersey**

---

## ✅ Automated Verification (Allerede gennemført)

- [x] Type check: `npx tsc --noEmit` - ✅ Passed
- [x] Build: `npm run build` - ✅ Passed  
- [x] Lint: `npm run lint` - ✅ Passed (0 errors i Jersey komponenter)

---

## 📋 Manual Verification Checklist

### 1. Import Test

**Test:**
- [ ] Naviger til `/test-jersey`
- [ ] Check browser console for errors
- [ ] Alle 2 komponenter skal være synlige

**Expected:**
- ✅ No console errors
- ✅ JerseyCard eksempler vises (3 mock jerseys)
- ✅ UploadJersey dialog kan åbnes

---

### 2. JerseyCard Test

#### Basic Rendering
- [ ] Card vises korrekt med image
- [ ] Card vises korrekt uden image (placeholder)
- [ ] Club name vises
- [ ] Season og type vises
- [ ] Player name vises (hvis tilgængelig)
- [ ] Condition badge vises (fx "9/10")
- [ ] For Sale badge vises når forSale=true

#### Navigation
- [ ] Click på card → URL ændres til `/jersey/[id]`
- [ ] Page loader vises under navigation
- [ ] Browser back button fungerer

#### Hover States
- [ ] Hover → Card skal scale (scale-105)
- [ ] Hover → Shadow skal ændre (shadow-elevated)
- [ ] Hover → Border skal highlight (border-primary/30)

#### Keyboard Navigation
- [ ] Tab til card → Focus skal være synlig (ring-2 ring-primary)
- [ ] Enter på focused card → Naviger til `/jersey/[id]`
- [ ] Space på focused card → Naviger til `/jersey/[id]`
- [ ] Focus state er tydelig visuel

#### Interactive Elements
- [ ] Like button (Heart icon) → Clickable, stop propagation
- [ ] Save button (Bookmark icon) → Clickable, stop propagation
- [ ] Like/Save buttons skal ikke trigger card navigation
- [ ] Like button → Fill når isLiked=true
- [ ] Save button → Fill når isSaved=true

#### Edge Cases
- [ ] Missing image → Placeholder vises ("No image")
- [ ] Very long club name → Truncates korrekt
- [ ] Very long player name → Truncates korrekt
- [ ] Condition 10/10 → Badge vises korrekt
- [ ] Condition 1/10 → Badge vises korrekt

---

### 3. UploadJersey Test

#### Dialog Open/Close
- [ ] Click "Open Upload Dialog" → Dialog åbner
- [ ] Click X button → Dialog lukker
- [ ] Click "Cancel" → Dialog lukker
- [ ] ESC key → Dialog lukker (hvis implementeret)
- [ ] Backdrop blur fungerer

#### Step 1: Image Upload
- [ ] Click "Add Photo" → File picker åbner
- [ ] Select 1 image → Image vises i grid
- [ ] Select multiple images (2-10) → Alle vises
- [ ] Select >10 images → Error toast: "Too Many Images"
- [ ] Select image >5MB → Error toast: "File Too Large"
- [ ] Drag to reorder images → Order ændres
- [ ] First image → "Cover" badge vises
- [ ] Remove image → Image fjernes
- [ ] Max 10 images → "Add Photo" button forsvinder

#### Step 2: Jersey Information
- [ ] Club field → Required, max 100 chars
- [ ] Season field → Required, max 20 chars
- [ ] Jersey Type dropdown → Required, alle typer vises
- [ ] "Next" button → Disabled hvis fields mangler
- [ ] Fill all required → "Next" button enabled
- [ ] "Back" button → Går til Step 1

#### Step 3: Player Print (Optional)
- [ ] Player Name field → Optional, max 50 chars
- [ ] Player Number field → Optional, max 3 chars
- [ ] Competition Badges → Clickable badges
- [ ] Toggle badge → Badge highlightes/unhighlights
- [ ] Multiple badges → Alle kan vælges
- [ ] "Next" button → Altid enabled (optional step)

#### Step 4: Condition & Notes
- [ ] Condition Slider → Drag fungerer
- [ ] Condition value → Updates live (fx "8/10")
- [ ] Notes textarea → Optional, max 1000 chars
- [ ] Character count → Updates live (fx "150/1000")
- [ ] Visibility switch → Toggle fungerer
- [ ] Visibility description → Updates baseret på switch

#### Validation Test
- [ ] Submit uden images → Error: "Please upload at least 1 image"
- [ ] Submit med images men uden Club → Error: "Club name is required"
- [ ] Submit med images men uden Season → Error: "Season is required"
- [ ] Submit med images men uden Jersey Type → Error: "Jersey type is required"
- [ ] Error messages → Vises i toast
- [ ] Error focus → First error field får focus (hvis implementeret)

#### Submit Test (Med Authentication)
**Prerequisites:** User skal være authenticated

- [ ] Submit med valid data → Upload starter
- [ ] Upload progress → Progress bar vises
- [ ] Upload success → Success toast: "Jersey Uploaded!"
- [ ] Upload success → Dialog lukker
- [ ] Upload success → Form resets
- [ ] onSuccess callback → Fires (check console)

#### Error Handling Test
- [ ] Network failure → Error toast med retry option
- [ ] File upload error → Error toast med specific message
- [ ] Database error → Error toast med user-friendly message
- [ ] Form data → Bevares ved fejl (ikke cleared)
- [ ] Retry → Form kan submit igen uden at starte forfra

#### Accessibility Test
- [ ] Form labels → Tilknyttet inputs (htmlFor/id)
- [ ] Required fields → aria-required="true"
- [ ] Error messages → Annonceres til screen readers
- [ ] File input → aria-label="Upload jersey images"
- [ ] Progress bar → aria-valuenow, aria-valuemin, aria-valuemax
- [ ] Keyboard navigation → Tab gennem alle fields
- [ ] Focus states → Synlige på alle interactive elements
- [ ] Badge toggles → Keyboard accessible (Enter/Space)

---

### 4. Integration Test

#### JerseyCard → UploadJersey Flow
- [ ] Upload jersey via UploadJersey
- [ ] JerseyCard vises med ny jersey (hvis list refreshes)
- [ ] Click på ny JerseyCard → Naviger til detail page

#### Real Data Test
- [ ] Upload med real Supabase connection
- [ ] Verify jersey oprettes i database
- [ ] Verify images uploads til storage
- [ ] Verify RLS policies respekteres

---

## 🐛 Known Issues / Notes

- [ ] List any issues found during testing
- [ ] Note any edge cases discovered
- [ ] Note performance observations

---

## ✅ Test Results Summary

**Date:** _______________

**Tester:** _______________

**Results:**
- [ ] All tests passed
- [ ] Issues found (see notes above)

**Next Steps:**
- [ ] Continue to Phase 3
- [ ] Fix issues before proceeding
- [ ] Update Linear with progress

---

## 🔍 Additional Test Scenarios

### Performance Test
- [ ] Upload 10 large images (5MB each) → Performance acceptable
- [ ] Multiple rapid clicks → No duplicate submissions
- [ ] Form submission → Submit button disabled during upload

### Browser Compatibility
- [ ] Chrome → All features work
- [ ] Firefox → All features work
- [ ] Safari → All features work
- [ ] Mobile browser → Responsive design works

### Edge Cases
- [ ] Very long club name (100 chars) → Handles correctly
- [ ] Very long notes (1000 chars) → Handles correctly
- [ ] Special characters i club/season → Handles correctly
- [ ] Upload samme fil to gange → Handles correctly



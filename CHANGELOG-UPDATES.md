# Skylon Platform Updates - 2025

## Summary of Changes

### 1. Bid Update Functionality ✅
**Problem**: Subcontractors couldn't update their bids after submitting - they would get a database error.

**Solution**:
- Changed bid submission from INSERT to UPSERT in `/app/projects/[id]/task/[taskId]/page.js`
- Pre-fill form with existing bid data when updating
- Added visual distinction between "Submit Proposal" and "Update Proposal"
- Show current bid details in a green card when bid exists
- Created database migration file to add unique constraint: `docs/ADD-BIDS-UNIQUE-CONSTRAINT.sql`

**Files Modified**:
- `app/projects/[id]/task/[taskId]/page.js` (lines 147-197, 342-352, 657-703, 727-795)

**Database Migration Required**:
Run `docs/ADD-BIDS-UNIQUE-CONSTRAINT.sql` in Supabase SQL Editor

---

### 2. Main Page Text Color - Cream/Beige ✅
**Problem**: Text was black and hard to read on dark background.

**Solution**:
- Changed all white text colors to warm cream/beige (#FFF8DC and #F5F5DC)
- Applied to header, hero section, buttons, and stats
- Improved contrast and readability

**Files Modified**:
- `app/page.js` (lines 625-630, 772-851)

---

### 3. Username Display After Login ✅
**Problem**: After login, the main page didn't show username - only "Login" button remained.

**Solution**:
- Added user authentication check to main page
- Display full_name or company_name instead of email
- Show user role badge
- Added Dashboard button and Logout button when logged in
- Maintains cream color scheme for consistency

**Files Modified**:
- `app/page.js` (lines 632-667, 804-849)

---

### 4. Blue Accents on Subcontractor Pages ✅
**Problem**: Dashboard pages lacked visual polish and clear separation between sections.

**Solution**:
- Added left border accents (4px) to all stat cards with color coding:
  - Blue for Active Projects
  - Green for Open Tasks/Total Projects
  - Purple for My Proposals/Subcontractors
- Added blue accent bars to section headings
- Added hover effects with shadows
- Added subtle blue dividing lines between bid entries
- Enhanced visual hierarchy

**Files Modified**:
- `app/dashboard/page.js` (lines 183-215, 363-411)

---

### 5. Multiple Document Upload with Enhanced UI ✅
**Problem**: Multiple file upload worked but UI didn't clearly show which files were selected or allow removal.

**Solution**:
- Created drag-and-drop style upload zone with dashed border
- Show all selected files in a list with:
  - File icon
  - File name and size
  - Individual remove button (X)
  - Clear all files button
- Visual feedback with green success color when files selected
- Better instructions: "Ctrl/Cmd + Click to select multiple"
- Accept specific file types: PDF, DWG, DXF, images, Office docs
- Loading button shows document count during upload
- Confirmation message below button

**Files Modified**:
- `app/admin/projects/[id]/category/[categoryId]/add-task/page.js` (lines 68-140, 298-384)

---

## Testing Checklist

- [ ] Test bid submission for new bids
- [ ] Test bid update for existing bids
- [ ] Verify main page text is readable (cream color)
- [ ] Verify username shows after login on main page
- [ ] Check dashboard blue accents display correctly
- [ ] Test multiple document upload:
  - [ ] Select multiple files
  - [ ] Remove individual files
  - [ ] Clear all files
  - [ ] Upload and verify all files saved

## Database Migration

**IMPORTANT**: Before testing bid updates, run:
```sql
-- In Supabase SQL Editor, run:
-- File: docs/ADD-BIDS-UNIQUE-CONSTRAINT.sql
ALTER TABLE bids
ADD CONSTRAINT unique_bid_per_task_subcontractor
UNIQUE (task_id, subcontractor_id);
```

## Browser Compatibility

All changes use standard CSS and JavaScript features compatible with:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Performance Impact

- Minimal - no significant performance changes
- File upload may take longer with multiple large documents (expected behavior)
- User auth check added to home page (single query, cached)

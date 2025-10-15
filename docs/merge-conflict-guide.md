# Resolving merge conflicts on the homepage

This project received a large visual refresh on `app/page.js`, so Git may raise conflicts
if you still have an older version of the file locally. Follow the checklist below to get
back to a clean working tree before committing.

1. **Check which files are conflicted**
   ```bash
   git status
   ```
   Anything listed under `both modified` still contains conflict markers that must be
   cleaned up.

2. **Open the conflicted file**
   ```bash
   npx prettier app/page.js
   ```
   If Prettier refuses to run because of conflict markers, open the file in your editor and
   search for `<<<<<<<`, `=======`, or `>>>>>>>`. These blocks wrap the two competing
   versions.

3. **Pick the correct sections**
   - Keep the version that includes the new helper functions: `parseDate`, `formatDate`, and
     `formatDateRange`.
   - Retain the procurement window gradient bar that appears underneath the schedule
     metadata.
   - Delete any duplicated sections so the JSX renders only once per project card.

4. **Remove the conflict markers**
   After deciding which code to keep, delete the `<<<<<<<`, `=======`, and `>>>>>>>` lines.
   The file should read naturally without those markers.

5. **Format and lint**
   ```bash
   npm run lint
   ```
   Lint warnings are acceptable, but there should be no errors. Fix any syntax errors that
   ESLint reports.

6. **Mark the conflict as resolved**
   ```bash
   git add app/page.js
   ```

7. **Commit the resolution**
   ```bash
   git commit -m "Resolve homepage merge conflicts"
   ```

If the conflict keeps reappearing when you pull new changes, run:

```bash
git fetch origin
git merge origin/main
```

Resolve conflicts again if prompted, then continue with your work.

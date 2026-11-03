# Homepage preview, image files and shared tags

**Goal:** Complete the approved items 3, 5 and 6 on the existing static GitHub Pages site.

**Architecture:** Keep the existing local draft and atomic GitHub commit. Use a same-origin iframe for unfinished homepage text, IndexedDB for pending image files, and one shared taxonomy module for admin and public filters.

**Constraints:** Keep overview first and the existing homepage edit scope. Never persist credentials. Keep unpublished images recoverable through a portable backup. Never publish content without all required image files. Preserve concurrent GitHub changes.

1. Shared tags: test explicit topic and character/holiday/situation filters, validation and legacy fallback. Add shared model and admin controls with temporary-form recovery. Seed existing records without guessing character identities.
2. Live preview: test slide selection, origin/source checks and unsaved settings. Add device controls and direct selection of the edited slide. Update tagline immediately without publishing or replacing saved drafts.
3. Image files: test content addressing, duplicate references, missing local files, atomic image/data publishing and portable backups. Save uploads separately, generate mobile variants, hydrate pending-image previews and migrate existing embedded images.
4. Verify the full test suite, check browser behavior, commit the complete change, publish and verify GitHub Pages and served files.

**Review focus:** Local storage failure keeps original images; backups include unpublished files; an old tab cannot overwrite newer content; explicit empty tags remain empty; previews never write unfinished text into the published draft.

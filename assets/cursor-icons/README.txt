CURSOR SYMBOL FILES
===================

The mouse trail can show a logo image for each symbol. Put the image files in
this folder. The file names below are the ones content.json expects:

  instagram.svg     ChatGPT (use openai.svg)
  openai.svg        Claude      claude.svg
  grok.svg          LinkedIn    linkedin.svg
  github.svg        DeepSeek    deepseek.svg
  notebooklm.svg    Gemini      gemini.svg
  perplexity.svg    Copilot     copilot.svg

HOW IT WORKS
------------
- If the file for a symbol is here, the site uses it. The image is recoloured
  to the trail colours, so a single-colour logo works best. Any colour in the
  file is replaced.
- If the file is missing or fails to load, the site uses the built-in line
  icon that matches the symbol (camera, bulb, rocket and so on).
- A text label (for example "IG") is only used when a symbol has neither an
  image nor a built-in icon.
- You can also upload an image for any symbol in Admin > Theme & SEO >
  Cursor symbols. Uploaded images are stored in content.json, so you don't
  need a file here.

WHERE TO GET LOGOS
------------------
Most of these logos are on https://simpleicons.org. Search the name, click
the icon, choose "Download SVG", and save it here with the file name above.
Check each brand's own guidelines before using its logo on a public site.

TIPS
----
- SVG files work best. PNG files also work, at 256 px or larger.
- A file with only a viewBox (no width/height) is fine.
- After adding files, reload the site. Browsers cache images, so use a hard
  refresh (Ctrl+Shift+R) if an old version still shows.

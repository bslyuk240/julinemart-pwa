# PWA Icons

Place your PWA icons in this directory. Icons should be square PNG files.

Required sizes:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## How to Generate Icons

### Option 1: Online Tool (Recommended)
Visit https://realfavicongenerator.net/
1. Upload your logo (square, at least 512x512px)
2. Generate all required sizes
3. Download and place in this folder

### Option 2: Manual (Using ImageMagick)
```bash
# Install ImageMagick first
convert logo.png -resize 72x72 icon-72x72.png
convert logo.png -resize 96x96 icon-96x96.png
convert logo.png -resize 128x128 icon-128x128.png
convert logo.png -resize 144x144 icon-144x144.png
convert logo.png -resize 152x152 icon-152x152.png
convert logo.png -resize 192x192 icon-192x192.png
convert logo.png -resize 384x384 icon-384x384.png
convert logo.png -resize 512x512 icon-512x512.png
```

### Option 3: Using Figma/Photoshop
Export your logo at each required size.

## Tips
- Use a simple, recognizable logo
- Ensure good contrast for visibility
- Test on different devices
- Consider maskable icons for Android
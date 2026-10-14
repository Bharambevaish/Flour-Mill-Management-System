# Landing hero media

The landing page picks its hero art from this folder automatically (no code
change needed), in this order:

1. `hero.webm` / `hero.mp4` — a looping clip (shown in a 4:3 rounded frame
   with the hover-tilt effect). `hero.jpg` is its poster and the still shown
   to visitors who prefer reduced motion.
2. `hero.jpg` / `hero.webp` alone — a still image.
3. Nothing here — the animated drawn chakki (`MillIllustration`).

Current clip: generated with Gemini (Veo), cropped from 1280×720 to 4:3,
audio removed, re-encoded (mp4 H.264 ≈ 250 KB, webm VP9 ≈ 200 KB):

    ffmpeg -i in.mp4 -an -vf "crop=960:720:160:0,scale=800:600:flags=lanczos" \
      -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -movflags +faststart hero.mp4
    ffmpeg -i in.mp4 -an -vf "crop=960:720:160:0,scale=800:600:flags=lanczos" \
      -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 hero.webm
    ffmpeg -ss 4 -i in.mp4 -frames:v 1 -vf "crop=960:720:160:0,scale=800:600" -q:v 4 hero.jpg

Note: this clip has its own English "Your flour is ready" / "Balance due"
cards baked in, so the page's own floating (bilingual) cards are hidden while
a video is in use. Delete the three files to go back to the drawn chakki.

# Flappy MC Stan – Night Concert Edition 🎤

A visually stunning **Flappy Bird-style browser game** featuring **MC Stan** as the playable character, flying through giant microphone obstacles in a nighttime concert stadium!

## 🎮 Gameplay

- **SPACE / Click / Tap** to fly MC Stan upward
- Navigate through the gap between giant microphones
- Don't hit the microphones or the ground!
- Score points (HYPE) for every mic pair you pass through
- Background music plays during gameplay, Game Over sound on collision

## 🚀 How to Run

### Option 1 – NPM (recommended)
```bash
npm install
npm start
```
Then open **http://localhost:3333** in your browser.

### Option 2 – Direct
```bash
npx http-server . -p 3333 -o
```

### Option 3 – Just open index.html
> ⚠️ Audio may not work without a local server due to browser autoplay restrictions.

## 🎵 Audio

| File | Purpose |
|------|---------|
| `assets/samay-audio.mp4` | Background music (loops during gameplay) |
| `assets/mc-stan-audio.mp4` | Game Over sound (plays once on death) |

## 🗂️ Project Structure

```
flappy-mc-stan/
├── index.html               # Main HTML
├── style.css                # Concert-themed CSS
├── game.js                  # Canvas game engine
├── package.json             # Project config
└── assets/
    ├── mc-stan-character.png   # MC Stan avatar
    ├── concert-background.png  # Night concert BG
    ├── microphone.png          # Obstacle sprite
    ├── samay-audio.mp4         # Background music
    └── mc-stan-audio.mp4       # Game Over sound
```

## ✨ Features

- 🎤 MC Stan as the playable character with animated neon glow ring
- 🌙 Immersive nighttime concert stadium background
- 🎙️ Giant microphone obstacles with neon lighting
- 💫 Particle effects when scoring
- 🎵 Background music + Game Over audio
- 🏆 High score saved with localStorage
- 📱 Mobile touch controls supported
- ⚡ Smooth 60fps canvas rendering
- 🎨 Concert-themed UI with animated spotlights & laser beams

## 📜 License

MIT © [imshivateja082-prog](https://github.com/imshivateja082-prog)

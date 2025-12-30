# Outline Electron

A lightweight Electron wrapper for [Outline](https://www.getoutline.com/) - the modern team knowledge base.

## Features

- Native desktop app experience for any Outline instance
- Configurable instance URL (saved to `~/.config/outline-electron/config.json`)
- Smooth scrolling
- Find in page (Ctrl+F)
- Browser-style navigation (Alt+Left/Right)
- Zoom controls (Ctrl++/Ctrl+-/Ctrl+0)
- Remembers window size and position

## Installation

### Nix Flake

```bash
# Run directly
nix run github:Mag1cByt3s/outline-electron

# Or install to profile
nix profile install github:Mag1cByt3s/outline-electron
```

### Build from source

```bash
git clone https://github.com/Mag1cByt3s/outline-electron
cd outline-electron
nix build
./result/bin/outline-electron
```

### Development

```bash
nix develop
electron src
```

## Usage

On first launch, you'll be prompted to enter your Outline instance URL (e.g., `https://docs.example.com`).

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl++ | Zoom in |
| Ctrl+- | Zoom out |
| Ctrl+0 | Reset zoom |
| Ctrl+F | Find in page |
| Alt+Left | Navigate back |
| Alt+Right | Navigate forward |
| F11 | Toggle fullscreen |

### Change Instance

To switch to a different Outline instance, use **File > Change Instance** from the menu bar.

## License

GPL-3.0

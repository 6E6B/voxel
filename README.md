<p align="center">
  <img src="resources/build/icons/png/512x512.png" alt="Voxel Logo" width="128" height="128" />
</p>

<h1 align="center">Voxel</h1>

<p align="center">
  <strong>A complete open-source Roblox desktop experience</strong>
</p>

<p align="center">
  A third-party Roblox launcher that provides multi-account management, enhanced server browsing, avatar editing, and more—all in one desktop app.
</p>

<p align="center">
  <a href="https://github.com/6E6B/voxel/releases">
    <img src="https://img.shields.io/github/v/release/6E6B/voxel?style=flat-square" alt="Latest Release" />
  </a>
  <img src="https://img.shields.io/github/downloads/6E6B/voxel/total?style=flat-square&label=downloads" alt="Total Downloads" />
  <a href="LICENSE"><img src="https://img.shields.io/github/license/6E6B/voxel?style=flat-square" alt="License" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/-Electron-47848F?style=flat-square&logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/-React-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/-Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
</p>

> [!NOTE]
> Credentials are stored locally and never leave your machine. They are encrypted using Electron's safeStorage (OS-level credential storage) and optionally with an additional AES-256-GCM layer derived from your PIN - [View Code](https://github.com/6E6B/voxel/blob/main/src/main/modules/system/StorageService.ts)

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Build from Source](#build-from-source)
- [Contributing](#contributing)
- [Disclaimer](#disclaimer)
- [License](#license)

## Features

**Launching**

- Multi-account management
- Multi-instance support
- Join via Place ID, Job ID, or Username
- Server region viewing
- Player & Studio version manager

**Avatar**

- 3D avatar editor
- Outfit management
- Inventory browser
- Accessory instance tree viewing

**Catalog & Economy**

- Catalog browser
- Transaction history
- Sales analytics
- Rolimons integration

**Social**

- Real-time friend presence
- Groups
- Quick join

**Tools**

- FFlags editor
- Asset downloader
- Activity logs
- Command palette (`Ctrl+K`)
- PIN lock

## Installation

Download the latest binary from [Releases](https://github.com/6E6B/voxel/releases).

| Platform    | Filename                |
| :---------- | :---------------------- |
| **Windows** | `voxel-x.x.x-setup.exe` |

> [!NOTE]
> Currently Windows-only. macOS and Linux support is planned.

## Build from Source

**Prerequisites:** Node.js (v18+) and npm/pnpm.

```bash
# Clone
git clone https://github.com/6E6B/voxel.git
cd voxel

# Install
npm install

# Dev
npm run dev

# Build
npm run build:win
```

## Contributing

Contributions are welcome! Please open an issue first to discuss any significant changes before submitting a pull request.

## Disclaimer

Voxel is not affiliated with, endorsed by, or sponsored by Roblox Corporation. Use at your own discretion.

## License

[MIT](LICENSE)
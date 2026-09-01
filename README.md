# Smart Apparel-LK Prototype

This is the React + Vite single-page application for the Smart Apparel-LK academic research prototype.

## Requirements
- Node.js (v18 or higher recommended)
- npm

## How to Install
To install the required dependencies, run:
```bash
npm install
```

## How to Run Locally
To start the development server, run:
```bash
npm run dev
```
The application will be available at `http://localhost:5173`.

## How to Build
To build the application for production, run:
```bash
npm run build
```
The compiled files will be generated in the `dist/` directory.

## Application Architecture & Capabilities

### Offline Design
This prototype is explicitly designed to work **offline**. There is no live backend requirement for the core interactions of the proposal prototype. All required mock behaviors and simulated state management are handled directly within the frontend application using local storage persistence and React state.

### AI Outputs
The AI functionality showcased in this prototype (including XAI and SHAP analysis) uses **precomputed demo outputs**. Live model inferencing is not performed.

### Output Modes
The application supports multiple output modes to showcase different levels of functionality:
- `PROTOTYPE_UI`
- `DEMO_PRECOMPUTED` (Default)
- `LIVE_VALIDATED`

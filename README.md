# STL Price Estimator

A Next.js application that calculates 3D printing costs and estimates for STL files using PrusaSlicer integration. This tool provides detailed analysis including filament usage, print time, volume calculations, and cost estimates for various materials.

## Features

- **STL File Upload & Analysis**: Calculate volume and dimensions of STL files
- **Material Selection**: Support for PLA, ABS, PETG, TPU, and ASA filaments
- **Custom Settings**: Configurable infill density and support structures
- **Cost Estimation**: Automatic cost calculation based on material type and weight
- **Print Parameters**: Detailed breakdown of print time, filament usage, and dimensions
- **Support Structure Analysis**: Volume and weight calculations for support materials

## Prerequisites

Before setting up this project, ensure you have the following installed on your system:

1. **Node.js** (version 16 or later) - [Download here](https://nodejs.org/)
2. **PrusaSlicer** - [Download here](https://www.prusa3d.com/page/prusaslicer_424/)
3. **Git** (for cloning the repository)

## Installation & Setup

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd stl-price-estimator
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Configure PrusaSlicer Path

**Critical Step**: Update the PrusaSlicer executable path in the code to match your system.

Open `app/api/upload/route.js` and locate line ~215:

```javascript
const command = `"C:\\Program Files\\Prusa3D\\PrusaSlicer\\prusa-slicer-console.exe" "${filePath}" --load "${prusaConfigPath}" --gcode-comments --export-gcode`;
```

Update the path based on your operating system:

**Windows:**
- Default: `C:\Program Files\Prusa3D\PrusaSlicer\prusa-slicer-console.exe`
- Alternative: `C:\Users\{username}\AppData\Local\PrusaSlicer\prusa-slicer-console.exe`

**macOS:**
```javascript
const command = `/Applications/PrusaSlicer.app/Contents/MacOS/PrusaSlicer "${filePath}" --load "${prusaConfigPath}" --gcode-comments --export-gcode`;
```

**Linux:**
```javascript
const command = `prusa-slicer "${filePath}" --load "${prusaConfigPath}" --gcode-comments --export-gcode`;
```

### 4. Verify PrusaSlicer Installation

Test that PrusaSlicer console is accessible:

**Windows:**
```cmd
"C:\Program Files\Prusa3D\PrusaSlicer\prusa-slicer-console.exe" --help
```

**macOS/Linux:**
```bash
prusa-slicer --help
```

### 5. Create Required Directories

The application will automatically create these, but you can create them manually:
```bash
mkdir uploads
```

### 6. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Configuration

### Material Settings

The application supports the following materials with preset densities and temperatures:

| Material | Density (g/cm³) | Temperature (°C) | Bed Temp (°C) | Price ($/g) |
|----------|----------------|------------------|---------------|-------------|
| PLA      | 1.24           | 200              | 60            | 0.025       |
| ABS      | 1.05           | 240              | 80            | 0.030       |
| PETG     | 1.27           | 230              | 70            | 0.035       |
| TPU      | 1.20           | 210              | 50            | 0.050       |
| ASA      | 1.05           | 245              | 80            | 0.040       |

### Updating Material Prices

To modify material prices, edit the `materialPrices` object in `app/api/upload/route.js` (around line ~380):

```javascript
const materialPrices = {
  'PLA': 0.025,      // $0.025 per gram
  'ABS': 0.030,      // $0.030 per gram  
  'PETG': 0.035,     // $0.035 per gram
  'TPU': 0.050,      // $0.050 per gram
  'ASA': 0.040,      // $0.040 per gram
};
```

## Usage

1. **Upload STL File**: Select an STL file using the file input
2. **Choose Material**: Select from PLA, ABS, PETG, TPU, or ASA
3. **Set Infill Density**: Choose percentage (typically 10-100%)
4. **Enable Supports**: Toggle support structures if needed
5. **Calculate**: Submit to get detailed analysis

## Output Information

The application provides comprehensive analysis including:

### Basic Measurements
- **STL Volume**: Original file volume in cm³
- **Print Dimensions**: Width × Depth × Height in mm
- **Print Volume**: Bounding box volume in cm³
- **Layer Count**: Total number of print layers

### Filament Analysis
- **Filament Length**: Total length in mm
- **Filament Volume**: Volume of filament in cm³
- **Filament Weight**: Weight in grams
- **Material Density**: Used density in g/cm³

### Support Structure Data (when enabled)
- **Support Filament Length**: Length of support material in mm
- **Support Filament Volume**: Volume of support material in cm³
- **Support Filament Weight**: Weight of support material in grams
- **Support Material Cost**: Cost breakdown for supports

### Time & Cost Estimates
- **Print Time**: Estimated total print duration
- **First Layer Time**: Time for first layer printing
- **Estimated Cost**: Total material cost including supports
- **Material Type & Settings**: Confirmation of selected parameters

## Project Structure

```
stl-price-estimator/
├── app/
│   ├── api/upload/route.js    # Main API endpoint for STL processing
│   ├── page.js                # Frontend interface
│   ├── layout.js              # App layout
│   └── globals.css            # Global styles
├── uploads/                   # Uploaded STL and generated G-code files
├── prusaconfig.ini           # PrusaSlicer configuration
└── public/                   # Static assets
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request



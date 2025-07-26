import { writeFile, mkdir, readFile } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { NextResponse } from 'next/server';

// Function to calculate STL file volume
function calculateSTLVolume(buffer) {
  try {
    // Check if it's binary STL (starts with any 80 bytes header)
    const header = buffer.toString('ascii', 0, 5);
    const isBinary = header !== 'solid';
    
    if (isBinary) {
      return calculateBinarySTLVolume(buffer);
    } else {
      return calculateAsciiSTLVolume(buffer.toString('ascii'));
    }
  } catch (error) {
    console.error('STL volume calculation error:', error);
    return null;
  }
}

function calculateBinarySTLVolume(buffer) {
  let volume = 0;
  const triangleCount = buffer.readUInt32LE(80);
  let offset = 84; // Skip header (80 bytes) + triangle count (4 bytes)
  
  for (let i = 0; i < triangleCount; i++) {
    // Skip normal vector (12 bytes)
    offset += 12;
    
  
    const v1 = {
      x: buffer.readFloatLE(offset),
      y: buffer.readFloatLE(offset + 4),
      z: buffer.readFloatLE(offset + 8)
    };
    offset += 12;
    
    const v2 = {
      x: buffer.readFloatLE(offset),
      y: buffer.readFloatLE(offset + 4),
      z: buffer.readFloatLE(offset + 8)
    };
    offset += 12;
    
    const v3 = {
      x: buffer.readFloatLE(offset),
      y: buffer.readFloatLE(offset + 4),
      z: buffer.readFloatLE(offset + 8)
    };
    offset += 12;
 
    offset += 2;
    

    volume += (v1.x * (v2.y * v3.z - v3.y * v2.z) +
               v2.x * (v3.y * v1.z - v1.y * v3.z) +
               v3.x * (v1.y * v2.z - v2.y * v1.z)) / 6.0;
  }
  
  return Math.abs(volume);
}

function calculateAsciiSTLVolume(content) {
  let volume = 0;
  const lines = content.split('\n');
  let vertices = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('vertex')) {
      const coords = line.split(/\s+/).slice(1).map(parseFloat);
      vertices.push({ x: coords[0], y: coords[1], z: coords[2] });

      if (vertices.length === 3) {
        const [v1, v2, v3] = vertices;
        volume += (v1.x * (v2.y * v3.z - v3.y * v2.z) +
                   v2.x * (v3.y * v1.z - v1.y * v3.z) +
                   v3.x * (v1.y * v2.z - v2.y * v1.z)) / 6.0;
        vertices = [];
      }
    }
  }
  
  return Math.abs(volume);
}


async function updatePrusaConfig(materialType, infillDensity, enableSupports = false) {
  const configPath = path.join(process.cwd(), 'prusaconfig.ini');
  
  try {
    // Read current config
    let configContent = await readFile(configPath, 'utf-8');

    const materialDensities = {
      'PLA': 1.24,
      'ABS': 1.05,
      'PETG': 1.27,
      'TPU': 1.20,
      'ASA': 1.05
    };

    const materialTemperatures = {
      'PLA': { temp: 200, bed: 60 },
      'ABS': { temp: 240, bed: 80 },
      'PETG': { temp: 230, bed: 70 },
      'TPU': { temp: 210, bed: 50 },
      'ASA': { temp: 245, bed: 80 }
    };
    
    const density = materialDensities[materialType] || 1.24;
    const temps = materialTemperatures[materialType] || { temp: 200, bed: 60 };
    //Updation 
    configContent = configContent.replace(
      /filament_type = .*/,
      `filament_type = ${materialType}`
    );

    configContent = configContent.replace(
      /filament_density = .*/,
      `filament_density = ${density}`
    );

    configContent = configContent.replace(
      /fill_density = .*/,
      `fill_density = ${infillDensity}%`
    );

    configContent = configContent.replace(
      /temperature = .*/,
      `temperature = ${temps.temp}`
    );
    
    configContent = configContent.replace(
      /first_layer_temperature = .*/,
      `first_layer_temperature = ${temps.temp}`
    );
    
    configContent = configContent.replace(
      /bed_temperature = .*/,
      `bed_temperature = ${temps.bed}`
    );
    
    configContent = configContent.replace(
      /first_layer_bed_temperature = .*/,
      `first_layer_bed_temperature = ${temps.bed}`
    );
    
    // Enable/disable support material based on user choice
    configContent = configContent.replace(
      /support_material = .*/,
      `support_material = ${enableSupports ? 1 : 0}`
    );
    
    
    configContent = configContent.replace(
      /binary_gcode = .*/,
      `binary_gcode = 0`
    );
    

    configContent = configContent.replace(
      /output_filename_format = .*/,
      `output_filename_format = [input_filename_base].gcode`
    );
    

    configContent = configContent.replace(
      /gcode_comments = .*/,
      `gcode_comments = 1`
    );
    
 
    await writeFile(configPath, configContent);
    console.log(`Updated config: ${materialType}, ${infillDensity}%, density: ${density}`);
    
  } catch (error) {
    console.error('Error updating prusa config:', error);
  }
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const materialType = formData.get('materialType') || 'PLA';
    const infillDensity = formData.get('infillDensity') || '25';
    const enableSupports = formData.get('enableSupports') === 'true' || false;
    
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadsDir = path.join(process.cwd(), 'uploads');

    await mkdir(uploadsDir, { recursive: true });
    
    const filePath = path.join(uploadsDir, file.name);
    await writeFile(filePath, buffer);

    const stlVolume = calculateSTLVolume(buffer);
    const stlVolumeFormatted = stlVolume ? (stlVolume / 1000).toFixed(2) + ' cm³' : 'Unable to calculate';

    // Update prusaconfig.ini with user selections
    await updatePrusaConfig(materialType, infillDensity, enableSupports);

    const prusaConfigPath = path.join(process.cwd(), 'prusaconfig.ini');
    
    // Determine the PrusaSlicer command based on the environment
    const isDocker = process.env.NODE_ENV === 'production' || process.platform === 'linux';
    const command = isDocker 
      ? `xvfb-prusa-slicer --load "${prusaConfigPath}" --gcode-comments --export-gcode "${filePath}"`
      : `"C:\\Program Files\\Prusa3D\\PrusaSlicer\\prusa-slicer-console.exe" "${filePath}" --load "${prusaConfigPath}" --gcode-comments --export-gcode`;

    return new Promise((resolve) => {
      exec(command, { timeout: 60000 }, async (err, stdout, stderr) => {
        console.log('Command executed:', command);
        console.log('stdout:', stdout);
        console.log('stderr:', stderr);
        console.log('error:', err);

        let expectedGcodePath = null;
        if (stdout && stdout.includes('Slicing result exported to')) {
          const match = stdout.match(/Slicing result exported to (.+\.gcode)/);
          if (match) {
            expectedGcodePath = match[1].trim();
            console.log('PrusaSlicer exported to:', expectedGcodePath);
          }
        }

        if (err) {
          console.error('PrusaSlicer warning/error:', err.message);

          if (err.message && err.message.includes('outside of the print volume')) {
            resolve(NextResponse.json({ 
              success: false, 
              error: 'STL file is too large for the printer bed. Please scale down your model.',
              volume: volume
            }));
            return;
          }

        }

        try {
          // Wait a moment for file system to sync
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // List all files in the uploads directory first
          const uploadsDir = path.dirname(filePath);
          console.log('Checking uploads directory:', uploadsDir);
          
          const { readdir } = await import('fs/promises');
          const allFiles = await readdir(uploadsDir);
          console.log('All files in uploads directory:', allFiles);
          
          // Filter for G-code files
          const gcodeFiles = allFiles.filter(f => f.endsWith('.gcode') || f.endsWith('.bgcode'));
          console.log('G-code files found:', gcodeFiles);
          
          // Read the generated G-code file to extract parameters
          // Handle multiple possible filename formats
          let gcodeFilePath;
          
          // First try the path from PrusaSlicer output
          if (expectedGcodePath && fs.existsSync(expectedGcodePath)) {
            gcodeFilePath = expectedGcodePath;
            console.log('Using PrusaSlicer reported path:', gcodeFilePath);
          } else {
            // Fallback to original logic
            gcodeFilePath = filePath.replace('.STL', '.gcode').replace('.stl', '.gcode');
          }
          

          let gcodeContent;
          try {
            console.log('Trying to read G-code file:', gcodeFilePath);
            gcodeContent = await readFile(gcodeFilePath, 'utf-8');
          } catch (firstError) {

            const uploadsDir = path.dirname(filePath);
            const baseName = path.basename(filePath, path.extname(filePath));
            
            console.log('Simple G-code file not found, searching for pattern files...');

            const { readdir } = await import('fs/promises');
            const files = await readdir(uploadsDir);
            
            const potentialFiles = files.filter(file => 
              file.startsWith(baseName) && (file.endsWith('.gcode') || file.endsWith('.bgcode'))
            );
            
            console.log('Found potential files:', potentialFiles);
            
            if (potentialFiles.length > 0) {
              gcodeFilePath = path.join(uploadsDir, potentialFiles[0]);
              console.log('Using G-code file:', gcodeFilePath);
              gcodeContent = await readFile(gcodeFilePath, 'utf-8');
            } else {
              throw new Error(`No G-code file found for ${baseName}`);
            }
          }
          
          console.log('G-code file size:', gcodeContent.length, 'characters');
          
          const parameters = {};
          const lines = gcodeContent.split('\n');
          console.log('Total G-code lines:', lines.length);

          let minX = Infinity, maxX = -Infinity;
          let minY = Infinity, maxY = -Infinity;
          let minZ = Infinity, maxZ = -Infinity;

          let parametersFound = 0;
          lines.forEach(line => {

            if (line.includes('; filament used [mm] =') || line.includes(';filament used [mm] =')) {
              parameters['Filament Length'] = line.split('=')[1].trim() + ' mm';
              parametersFound++;
              console.log('Found filament length:', line);
            }
            if (line.includes('; filament used [cm3] =') || line.includes(';filament used [cm3] =')) {
              parameters['Filament Volume'] = line.split('=')[1].trim() + ' cm³';
              parametersFound++;
              console.log('Found filament volume:', line);
            }
            if (line.includes('; total filament used [g] =') || line.includes(';total filament used [g] =')) {
              parameters['Filament Weight'] = line.split('=')[1].trim() + ' g';
              parametersFound++;
              console.log('Found total filament weight:', line);
            }
            if (line.includes('; filament used [g] =') || line.includes(';filament used [g] =')) {
              parameters['Filament Weight'] = line.split('=')[1].trim() + ' g';
              parametersFound++;
              console.log('Found filament weight:', line);
            }
            if (line.includes('; estimated printing time (normal mode) =') || line.includes(';estimated printing time (normal mode) =')) {
              parameters['Print Time'] = line.split('=')[1].trim();
              parametersFound++;
              console.log('Found print time (normal):', line);
            }
            if (line.includes('; estimated first layer printing time (normal mode) =') || line.includes(';estimated first layer printing time (normal mode) =')) {
              parameters['First Layer Time'] = line.split('=')[1].trim();
              parametersFound++;
              console.log('Found first layer time (normal):', line);
            }
            
     
            if (line.includes('; estimated printing time =') || line.includes(';estimated printing time =')) {
              parameters['Print Time'] = line.split('=')[1].trim();
              parametersFound++;
              console.log('Found print time:', line);
            }
            if (line.includes('; estimated first layer printing time =') || line.includes(';estimated first layer printing time =')) {
              parameters['First Layer Time'] = line.split('=')[1].trim();
              parametersFound++;
              console.log('Found first layer time:', line);
            }
            
       
            if (line.includes('; support filament used [mm] =') || line.includes(';support filament used [mm] =')) {
              parameters['Support Filament Length'] = line.split('=')[1].trim() + ' mm';
              parametersFound++;
              console.log('Found support length:', line);
            }
            if (line.includes('; support filament used [cm3] =') || line.includes(';support filament used [cm3] =')) {
              parameters['Support Filament Volume'] = line.split('=')[1].trim() + ' cm³';
              parametersFound++;
              console.log('Found support volume:', line);
            }
            if (line.includes('; support filament used [g] =') || line.includes(';support filament used [g] =')) {
              parameters['Support Filament Weight'] = line.split('=')[1].trim() + ' g';
              parametersFound++;
              console.log('Found support weight:', line);
            }
            
          
            if (line.includes('; total filament cost =') || line.includes(';total filament cost =')) {
              parameters['Filament Cost (Slicer)'] = '$' + line.split('=')[1].trim();
              parametersFound++;
              console.log('Found filament cost:', line);
            }
            
        
            if (line.startsWith('G1') || line.startsWith('G0') || line.startsWith('G92')) {
              const xMatch = line.match(/X([-\d.]+)/);
              const yMatch = line.match(/Y([-\d.]+)/);
              const zMatch = line.match(/Z([-\d.]+)/);
              
              if (xMatch) {
                const x = parseFloat(xMatch[1]);
                if (!isNaN(x)) {
                  minX = Math.min(minX, x);
                  maxX = Math.max(maxX, x);
                }
              }
              if (yMatch) {
                const y = parseFloat(yMatch[1]);
                if (!isNaN(y)) {
                  minY = Math.min(minY, y);
                  maxY = Math.max(maxY, y);
                }
              }
              if (zMatch) {
                const z = parseFloat(zMatch[1]);
                if (!isNaN(z) && z > 0) { 
                  minZ = Math.min(minZ, z);
                  maxZ = Math.max(maxZ, z);
                }
              }
            }
          });
          
          console.log(`Total parameters found in G-code: ${parametersFound}`);

         
          parameters['STL Volume'] = stlVolumeFormatted;

         
          if (minX !== Infinity && maxX !== -Infinity && 
              minY !== Infinity && maxY !== -Infinity && 
              minZ !== Infinity && maxZ !== -Infinity) {
            
            const width = (maxX - minX).toFixed(2);
            const depth = (maxY - minY).toFixed(2);
            const height = (maxZ - minZ).toFixed(2);
            const volume = (width * depth * height / 1000).toFixed(2); 
            
            parameters['Print Dimensions'] = `${width} × ${depth} × ${height} mm`;
            parameters['Print Volume'] = `${volume} cm³`;
          }

        
          const filamentLengthMm = parseFloat(parameters['Filament Length']?.replace(' mm', '') || '0');
          const filamentVolumeCm3 = parseFloat(parameters['Filament Volume']?.replace(' cm³', '') || '0');
          let filamentWeight = parseFloat(parameters['Filament Weight']?.replace(' g', '').replace('(calculated)', '').trim() || '0');
          
        
          if (filamentWeight === 0 && filamentVolumeCm3 > 0) {
           
            const materialDensities = {
              'PLA': 1.24,
              'ABS': 1.05,
              'PETG': 1.27,
              'TPU': 1.20,
              'ASA': 1.05,
              'Default': 1.24  
            };
            
            const density = materialDensities[materialType] || materialDensities['Default'];
            filamentWeight = (filamentVolumeCm3 * density);
            parameters['Filament Weight'] = filamentWeight.toFixed(2) + ' g (calculated)';
            parameters['Material Density'] = density + ' g/cm³';
          }

          let layerCount = 0;
          lines.forEach(line => {
            if (line.includes(';LAYER:') || line.includes('; layer ') || line.includes(';layer ')) {
              layerCount++;
            }
          });
          if (layerCount > 0) {
            parameters['Layer Count'] = layerCount.toString();
          }
          

          const materialPrices = {
            'PLA': 0.025,      // $0.025 per gram
            'ABS': 0.030,      // $0.030 per gram  
            'PETG': 0.035,     // $0.035 per gram
            'TPU': 0.050,      // $0.050 per gram
            'ASA': 0.040,      // $0.040 per gram
            'Default': 0.025   // Default to PLA pricing
          };
          
         
          const pricePerGram = materialPrices[materialType] || materialPrices['Default'];
          
          if (filamentWeight > 0) {
            let totalCost = filamentWeight * pricePerGram;
            
         
            const supportWeight = parseFloat(parameters['Support Filament Weight']?.replace(' g', '') || '0');
            if (supportWeight > 0) {
              const supportCost = supportWeight * pricePerGram;
              totalCost += supportCost;
              parameters['Support Material Cost'] = `$${supportCost.toFixed(2)} (${materialType})`;
            }
            
            parameters['Material Type'] = materialType;
            parameters['Infill Density'] = `${infillDensity}%`;
            parameters['Support Structures'] = enableSupports ? 'Enabled' : 'Disabled';
            parameters['Estimated Cost'] = `$${totalCost.toFixed(2)} (${materialType})`;
          }

          console.log('Extracted parameters:', Object.keys(parameters));
          console.log('Parameters with values:', parameters);

          resolve(NextResponse.json({
            success: true,
            parameters: parameters,
            filePath: filePath,
            gcodeFilePath: gcodeFilePath
          }));
        } catch (parseError) {
          console.error('G-code parsing error:', parseError);
          resolve(NextResponse.json({
            success: false,
            error: `Failed to parse G-code: ${parseError.message}`
          }));
        }
      });
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    });
  }
}

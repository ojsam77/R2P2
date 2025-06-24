import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Check if sharp is installed, if not install it
let sharp;
try {
  sharp = await import('sharp');
} catch (error) {
  console.log('Installing sharp for image optimization...');
  execSync('npm install sharp', { stdio: 'inherit' });
  sharp = await import('sharp');
}

// Image directories to process
const imageDirs = [
  './images',
  './src/assets',
  './src/assets/Healing',
  './src/assets/Nutrition',
  './src/assets/Yoga',
  './src/assets/Testimonials'
];

// Supported image formats
const supportedFormats = ['.jpg', '.jpeg', '.png', '.webp'];

// Responsive image sizes for mobile optimization
const responsiveSizes = [
  { width: 320, suffix: '-mobile' },
  { width: 480, suffix: '-small' },
  { width: 768, suffix: '-medium' },
  { width: 1024, suffix: '-large' },
  { width: 1920, suffix: '-xl' }
];

// Quality settings for different formats
const qualitySettings = {
  webp: 80,
  jpeg: 85,
  png: 90
};

async function optimizeImage(inputPath, outputDir, filename, format) {
  try {
    const image = sharp.default(inputPath);
    const metadata = await image.metadata();
    
    // Create WebP version
    const webpFilename = filename.replace(/\.[^/.]+$/, '.webp');
    const webpPath = path.join(outputDir, webpFilename);
    
    await image
      .webp({ quality: qualitySettings.webp })
      .toFile(webpPath);
    
    console.log(`✓ Created WebP: ${webpFilename}`);
    
    // Create responsive versions
    for (const size of responsiveSizes) {
      if (metadata.width > size.width) {
        const responsiveFilename = filename.replace(/\.[^/.]+$/, `${size.suffix}.webp`);
        const responsivePath = path.join(outputDir, responsiveFilename);
        
        await sharp.default(inputPath)
          .resize(size.width, null, { withoutEnlargement: true })
          .webp({ quality: qualitySettings.webp })
          .toFile(responsivePath);
        
        console.log(`✓ Created responsive: ${responsiveFilename} (${size.width}px)`);
      }
    }
    
    // Create optimized original format
    const optimizedFilename = filename.replace(/\.[^/.]+$/, '-optimized' + path.extname(filename));
    const optimizedPath = path.join(outputDir, optimizedFilename);
    
    if (format === 'jpeg' || format === 'jpg') {
      await image
        .jpeg({ quality: qualitySettings.jpeg, progressive: true })
        .toFile(optimizedPath);
    } else if (format === 'png') {
      await image
        .png({ quality: qualitySettings.png, compressionLevel: 9 })
        .toFile(optimizedPath);
    }
    
    console.log(`✓ Created optimized: ${optimizedFilename}`);
    
  } catch (error) {
    console.error(`✗ Error processing ${filename}:`, error.message);
  }
}

async function processDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`Directory not found: ${dirPath}`);
    return;
  }
  
  console.log(`\nProcessing directory: ${dirPath}`);
  
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      await processDirectory(filePath);
    } else {
      const ext = path.extname(file).toLowerCase();
      if (supportedFormats.includes(ext)) {
        console.log(`\nProcessing: ${file}`);
        await optimizeImage(filePath, dirPath, file, ext.slice(1));
      }
    }
  }
}

async function createImageManifest() {
  const manifest = {
    images: {},
    lastUpdated: new Date().toISOString()
  };
  
  for (const dir of imageDirs) {
    if (fs.existsSync(dir)) {
      manifest.images[dir] = [];
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (supportedFormats.includes(ext) || ext === '.webp') {
          manifest.images[dir].push({
            filename: file,
            path: path.join(dir, file),
            size: fs.statSync(path.join(dir, file)).size,
            format: ext.slice(1)
          });
        }
      }
    }
  }
  
  fs.writeFileSync('image-manifest.json', JSON.stringify(manifest, null, 2));
  console.log('\n✓ Created image manifest: image-manifest.json');
}

async function main() {
  console.log('🚀 Starting image optimization for mobile...\n');
  
  // Process all image directories
  for (const dir of imageDirs) {
    await processDirectory(dir);
  }
  
  // Create image manifest
  await createImageManifest();
  
  console.log('\n✅ Image optimization complete!');
  console.log('\n📱 Mobile optimizations applied:');
  console.log('• WebP versions created for better compression');
  console.log('• Responsive image sizes generated');
  console.log('• Original images optimized');
  console.log('• Image manifest created for reference');
}

// Run the optimization
main().catch(console.error); 
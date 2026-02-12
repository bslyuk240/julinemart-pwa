const fs = require('fs');
const path = require('path');

// List of Capacitor plugins that need ProGuard fix
const pluginsToFix = [
  'node_modules/@capacitor/app/android/build.gradle',
  'node_modules/@capacitor/browser/android/build.gradle',
  'node_modules/@capacitor/status-bar/android/build.gradle',
  'node_modules/@capacitor/push-notifications/android/build.gradle',
];

console.log('🔧 Fixing Capacitor ProGuard configuration...');

pluginsToFix.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace old ProGuard file with new one
    if (content.includes("proguard-android.txt")) {
      content = content.replace(
        /getDefaultProguardFile\('proguard-android\.txt'\)/g,
        "getDefaultProguardFile('proguard-android-optimize.txt')"
      );
      
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
    } else {
      console.log(`⏭️  Skipped (already fixed): ${filePath}`);
    }
  } else {
    console.log(`⚠️  Not found: ${filePath}`);
  }
});

console.log('✅ ProGuard fix complete!');

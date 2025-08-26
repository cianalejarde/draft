// start.js - CLICARE Admin Backend Startup Script
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Helper function to log with colors
const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

// Check if required files exist
const checkRequiredFiles = () => {
  const requiredFiles = [
    'server.js',
    'package.json',
    '.env'
  ];

  const missingFiles = [];

  requiredFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      missingFiles.push(file);
    }
  });

  if (missingFiles.length > 0) {
    log('❌ Missing required files:', 'red');
    missingFiles.forEach(file => {
      log(`   - ${file}`, 'red');
    });
    log('\nPlease ensure all backend files are in place.', 'yellow');
    process.exit(1);
  }

  log('✅ All required files found', 'green');
};

// Check if node_modules exists
const checkDependencies = () => {
  if (!fs.existsSync('node_modules')) {
    log('📦 Installing dependencies...', 'yellow');
    
    const install = spawn('npm', ['install'], { 
      stdio: 'inherit',
      shell: true 
    });

    install.on('close', (code) => {
      if (code !== 0) {
        log('❌ Failed to install dependencies', 'red');
        process.exit(1);
      }
      log('✅ Dependencies installed successfully', 'green');
      startServer();
    });
  } else {
    log('✅ Dependencies already installed', 'green');
    startServer();
  }
};

// Check environment variables
const checkEnvironment = () => {
  require('dotenv').config();

  const requiredEnvVars = [
    'REACT_APP_SUPABASE_URL',
    'REACT_APP_SUPABASE_ANON_KEY',
    'JWT_SECRET'
  ];

  const missingVars = [];

  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    log('❌ Missing required environment variables:', 'red');
    missingVars.forEach(varName => {
      log(`   - ${varName}`, 'red');
    });
    log('\nPlease check your .env file configuration.', 'yellow');
    return false;
  }

  log('✅ Environment configuration valid', 'green');
  return true;
};

// Start the server
const startServer = () => {
  if (!checkEnvironment()) {
    process.exit(1);
  }

  log('\n🚀 Starting CLICARE Admin Backend...', 'cyan');
  log('📊 Server will be available at http://localhost:' + (process.env.PORT || '5000'), 'blue');
  log('🔍 Press Ctrl+C to stop the server\n', 'yellow');

  const serverProcess = spawn('node', ['server.js'], {
    stdio: 'inherit',
    shell: true
  });

  // Handle server process events
  serverProcess.on('close', (code) => {
    if (code === 0) {
      log('\n👋 Server stopped gracefully', 'green');
    } else {
      log(`\n❌ Server stopped with error code: ${code}`, 'red');
    }
  });

  serverProcess.on('error', (error) => {
    log(`\n❌ Failed to start server: ${error.message}`, 'red');
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log('\n🛑 Shutting down server...', 'yellow');
    serverProcess.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    log('\n🛑 Shutting down server...', 'yellow');
    serverProcess.kill('SIGTERM');
  });
};

// Initialize database if needed
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    log('🔍 Checking database initialization...', 'yellow');
    
    const initProcess = spawn('node', ['initializeAdminDatabase.js'], {
      stdio: 'pipe',
      shell: true
    });

    let output = '';
    initProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    initProcess.stderr.on('data', (data) => {
      output += data.toString();
    });

    initProcess.on('close', (code) => {
      if (code === 0) {
        log('✅ Database initialization completed', 'green');
        resolve();
      } else {
        log('❌ Database initialization failed', 'red');
        console.log(output);
        reject(new Error('Database initialization failed'));
      }
    });
  });
};

// Main startup function
const main = async () => {
  log('🏥 CLICARE Admin Backend Startup', 'bright');
  log('=====================================', 'cyan');

  try {
    // Step 1: Check required files
    checkRequiredFiles();

    // Step 2: Initialize database (if needed)
    if (fs.existsSync('initializeAdminDatabase.js')) {
      await initializeDatabase();
    }

    // Step 3: Check and install dependencies
    checkDependencies();

  } catch (error) {
    log(`❌ Startup failed: ${error.message}`, 'red');
    process.exit(1);
  }
};

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  log('🏥 CLICARE Admin Backend Startup Script', 'bright');
  log('=====================================', 'cyan');
  log('Usage: node start.js [options]', 'blue');
  log('\nOptions:', 'yellow');
  log('  --help, -h     Show this help message', 'green');
  log('  --init-db      Initialize database only', 'green');
  log('  --check-env    Check environment configuration only', 'green');
  log('\nExample:', 'yellow');
  log('  node start.js              # Start the backend server', 'blue');
  log('  node start.js --init-db    # Initialize database only', 'blue');
  log('  node start.js --check-env  # Check environment only', 'blue');
  process.exit(0);
}

if (args.includes('--init-db')) {
  log('🔧 Database initialization mode', 'yellow');
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
  return;
}

if (args.includes('--check-env')) {
  log('🔍 Environment check mode', 'yellow');
  if (checkEnvironment()) {
    log('✅ Environment configuration is valid', 'green');
    process.exit(0);
  } else {
    process.exit(1);
  }
  return;
}

// Run the main startup process
main();
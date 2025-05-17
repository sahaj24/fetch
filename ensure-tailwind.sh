#!/bin/bash

# Make sure tailwindcss is available
echo "Checking for tailwindcss module..."
if ! node -e "try{require.resolve('tailwindcss')}catch(e){process.exit(1)}"; then
  echo "Installing tailwindcss as it was not found..."
  npm install --save tailwindcss@latest postcss@latest autoprefixer@latest tailwindcss-animate
  export NODE_PATH=/app/node_modules:$NODE_PATH
fi

# Start the application
exec npm start

# ConVis Visualization Tool - Quick Setup Guide

1. Enter Project Directory
```bash
cd ConVis
```

2. Install Node Version Manager (nvm) (if not installed)
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bash_profile   # or source ~/.zshrc if using zsh
```

3. Install Node.js 18
```bash
nvm install 18
nvm use 18
nvm alias default 18
```

4. Clean Previous Installations
```bash
rm -rf node_modules
rm package-lock.json
```

5. Install Project Dependencies
```bash
npm install
```

6. Start the Project
```bash
npx vite
```

Then open your browser and visit:
```
http://localhost:5173
```


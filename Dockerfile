# Use Ubuntu as base image
FROM ubuntu:22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_MAJOR=20

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    xvfb \
    libgl1-mesa-glx \
    libglu1-mesa \
    libxrandr2 \
    libxinerama1 \
    libxcursor1 \
    libxi6 \
    libxss1 \
    libgconf-2-4 \
    libxtst6 \
    libxcomposite1 \
    libasound2 \
    libfontconfig1 \
    libcairo2 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    libpango-1.0-0 \
    libharfbuzz0b \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxdamage1 \
    libxss1 \
    libxtst6 \
    libnss3 \
    libgbm1 \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
RUN echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
RUN apt-get update && apt-get install -y nodejs

# Download and install PrusaSlicer AppImage
RUN wget https://github.com/prusa3d/PrusaSlicer/releases/download/version_2.9.2/PrusaSlicer-2.9.2+linux-x64-GTK3-202501171444.AppImage -O /usr/local/bin/PrusaSlicer.AppImage
RUN chmod +x /usr/local/bin/PrusaSlicer.AppImage

# Extract AppImage to avoid FUSE issues in containers
RUN cd /usr/local/bin && ./PrusaSlicer.AppImage --appimage-extract
RUN mv /usr/local/bin/squashfs-root /usr/local/bin/PrusaSlicer
RUN rm /usr/local/bin/PrusaSlicer.AppImage

# Create symlink for easy access
RUN ln -s /usr/local/bin/PrusaSlicer/AppRun /usr/local/bin/prusa-slicer

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Create a script to run PrusaSlicer with virtual display
RUN echo '#!/bin/bash\nxvfb-run -a --server-args="-screen 0 1024x768x24 -ac +extension GLX +render -noreset" "$@"' > /usr/local/bin/xvfb-prusa-slicer
RUN chmod +x /usr/local/bin/xvfb-prusa-slicer

# Start the application
CMD ["npm", "start"]

# Use an official Node.js runtime as the base image
FROM node:18

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies (and ensure bcrypt is rebuilt)
RUN npm install && npm rebuild bcrypt --build-from-source

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3001

# Set environment variables (optional)
ENV NODE_ENV=production

# Start the application
CMD ["node", "server.js"]

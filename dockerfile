# Stage 1: Build Stage

# Base image to install necessary dependencies
FROM node:18-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and install dependencies
COPY package.json yarn.lock ./
RUN yarn install

# Copy the entire application into the container
COPY . .

# Step 1: Run Aztec Sandbox
# Here we assume aztec-sandbox can be installed via npm
RUN yarn global add @aztec/sandbox
RUN aztec-sandbox --start --detached

# Step 2: Compile and Deploy the Noir contract
# You need to have your Noir contract in the 'contracts' directory
WORKDIR /app/contracts
RUN noir compile
RUN noir deploy --sandbox-url http://localhost:8080

# Step 3: Update the contract address in the .env file
# Assuming you use sed to modify the contract address dynamically
RUN sed -i 's/CONTRACT_ADDRESS=.*/CONTRACT_ADDRESS=<YOUR_DEPLOYED_CONTRACT_ADDRESS>/' ../.env

# Step 4: Run Hardhat Deployment
WORKDIR /app
RUN yarn hardhat deploy

# Step 5: Start the Bridge Server
# Assuming you have a start script for the bridge server in package.json
RUN yarn start:bridge

# Stage 2: Production Stage

# Base image for serving HTML files
FROM nginx:alpine

# Copy the built application from the builder stage
COPY --from=builder /app/public /usr/share/nginx/html

# Expose the port for Nginx
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]

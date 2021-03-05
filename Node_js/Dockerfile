FROM node:14

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install && \
npm install @mysql/xdevapi --save --save-exact && \
npm install qrcode -- save
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

EXPOSE 8080
CMD [ "node", "server.js" ]

#docker build . -t node --network=host --add-host=host.docker.internal:host-gateway
#docker run -p 8080:8080 node

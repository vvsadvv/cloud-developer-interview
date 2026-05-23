FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
COPY static/app/package*.json ./static/app/

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "tunnel"]

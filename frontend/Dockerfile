# Dev image: Vite dev server with HMR. Production build is done by infra/nginx multi-stage image.
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["sh", "-c", "npm install --prefer-offline && npm run dev"]

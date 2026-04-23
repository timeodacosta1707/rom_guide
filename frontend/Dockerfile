# Utilisation d'une image Node.js légère
FROM node:20-alpine

# Répertoire de travail
WORKDIR /usr/src/app

# Copie des fichiers de configuration
COPY package*.json ./

# Installation des dépendances
RUN npm install

# Copie du reste du code
COPY . .

# On expose le port de Next.js
EXPOSE 3000

# Lancement en mode développement
CMD ["npm", "run", "dev"]
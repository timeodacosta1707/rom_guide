# Utilisation d'une image Node.js légère
FROM node:20-alpine

# Création et définition du répertoire de travail dans le conteneur
WORKDIR /usr/src/app

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances
RUN npm install

# Copie de tout le reste du code source
COPY . .

# On expose le port sur lequel NestJS tourne
EXPOSE 3000

# Commande de démarrage en mode développement (avec hot-reload)
CMD ["npm", "run", "start:dev"]
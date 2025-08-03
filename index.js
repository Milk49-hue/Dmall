/**
 * Bot Discord — discord.js v14
 * 
 * 1. Charge le token depuis process.env.DISCORD_TOKEN
 * 2. Ne crash plus si le token manque : juste un log d’erreur
 * 3. Tente la connexion et affiche l’erreur (TokenInvalid ou autre)
 */

require('dotenv').config(); // charge .env (local) ou Variables d’environnement (Render)
const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Fichier JSON pour garder la trace des membres déjà DMés
const DMED_FILE = path.join(__dirname, 'dmed.json');

// Message à envoyer en DM
const ANNOUNCE_MESSAGE = `# Salut à toi ! 👋
> ➜ **On a ouvert un tout nouveau serveur encore plus stylé, avec plein de nouveautés et une communauté encore plus active !** 🎉
> ➜ **Si tu fais partie des vrais, rejoins-nous là-bas et découvre tout ce qu’on a préparé pour toi** 🔥
👉 Voici le lien : https://discord.gg/6A5KVEANB9
On t’attend ! 😉`;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Charge la liste des IDs DMés (ou renvoie [] si pas de fichier)
function loadDMed() {
  if (!fs.existsSync(DMED_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DMED_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

// Sauvegarde la liste des IDs DMés
function saveDMed(list) {
  fs.writeFileSync(DMED_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

// Envoie un DM à tous les membres éligibles
async function dmAllMembers(guild) {
  const dmed = loadDMed();
  await guild.members.fetch(); // récupère tous les membres en cache

  for (const member of guild.members.cache.values()) {
    if (
      member.user.bot ||
      dmed.includes(member.id) ||
      member.permissions.has(PermissionFlagsBits.BanMembers) ||
      member.permissions.has(PermissionFlagsBits.KickMembers) ||
      member.permissions.has(PermissionFlagsBits.ManageRoles) ||
      member.permissions.has(PermissionFlagsBits.ModerateMembers)
    ) continue;

    try {
      await member.send(ANNOUNCE_MESSAGE);
      dmed.push(member.id);
      saveDMed(dmed);
    } catch (err) {
      console.error(`Impossible de DM ${member.user.tag}:`, err);
    }
  }

  return `✅ DMs envoyés à ${dmed.length} membres (hors bots et staff).`;
}

client.once('ready', () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;
  if (message.content.trim() !== '+dmall') return;

  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply('🚫 Vous devez être administrateur pour utiliser cette commande.');
  }

  const statusMsg = await message.channel.send('🚀 Envoi des DMs en cours…');
  try {
    const result = await dmAllMembers(message.guild);
    await statusMsg.edit(result);
  } catch (err) {
    console.error(err);
    await statusMsg.edit('❌ Une erreur est survenue lors de l’envoi des DMs.');
  }
});

// === CHARGEMENT DU TOKEN ===
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('❌ AUCUN DISCORD_TOKEN trouvé dans process.env ! Vérifie ton .env ou tes Env Vars sur Render.');
} else {
  console.log('✅ DISCORD_TOKEN chargé :', token.slice(0,4) + '…' + token.slice(-4));
}

// Tente la connexion, affichera une erreur (TokenInvalid) si le token est invalide
client.login(token).catch(err => {
  console.error('❌ Échec de connexion :', err);
});
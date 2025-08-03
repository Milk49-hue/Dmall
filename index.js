/**
 * Bot Discord — discord.js v14
 * Installez :
 *   npm install discord.js dotenv
 * Variables d’environnement :
 *   DISCORD_TOKEN=<votre_token>
 */

require('dotenv').config(); // charge .env en tout premier
const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// ID du fichier de suivi des membres déjà DM
const DMED_FILE = path.join(__dirname, 'dmed.json');

// Message d’annonce à envoyer
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

// Charge la liste des IDs déjà DM
function loadDMed() {
  if (!fs.existsSync(DMED_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(DMED_FILE, 'utf-8')); }
  catch { return []; }
}

// Sauvegarde la liste
function saveDMed(list) {
  fs.writeFileSync(DMED_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

// Logique d’envoi de DM à tous les membres éligibles d’une guild
async function dmAllMembers(guild, invokingUser) {
  let dmed = loadDMed();

  // fetch pour avoir tous les membres en cache
  await guild.members.fetch();

  for (const member of guild.members.cache.values()) {
    // filtres : pas de bot, pas déjà DM, pas de modérateurs/admins
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
      // save après chaque envoi pour persistance en cas de crash
      saveDMed(dmed);
    } catch (err) {
      console.error(`Impossible de DM ${member.user.tag}:`, err);
    }
  }

  // Feedback dans le salon d’où la commande a été lancée
  return `✅ DMs envoyés à ${dmed.length} membres (hors bots et staff).`;
}

client.once('ready', () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  const content = message.content.trim();

  // Commande +dmall
  if (content === '+dmall') {
    // Vérification de permission : ici, seul un administrateur peut lancer
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('🚫 Vous devez être administrateur pour utiliser cette commande.');
    }

    // Ack
    const statusMsg = await message.channel.send('🚀 Envoi des DMs en cours…');
    try {
      const resultText = await dmAllMembers(message.guild, message.author);
      await statusMsg.edit(resultText);
    } catch (err) {
      console.error(err);
      await statusMsg.edit('❌ Une erreur est survenue lors de l’envoi des DMs.');
    }
  }
});

// Utilisation de la variable d'environnement pour la connexion
client.login(process.env.DISCORD_TOKEN)
  .catch(err => console.error('❌ Échec de connexion :', err));

/**
 * Bot principal — discord.js v14
 * Installez :
 *   npm install discord.js express dotenv
 * Variables d’environnement :
 *   DISCORD_TOKEN=<votre_token>
 */

require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ActivityType
} = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');

// ---------- Constantes globales ----------
const GUILD_NAME               = 'Olia 👒';

// Salons / catégories
const DISCUSSION_CHANNEL_ID    = '1398482979063337057';
const TICKET_CHANNEL_ID        = '1398483002572406846';
const NOTIF_CHANNEL_ID         = '1398482911443026120';
const SOUTIEN_CHANNEL_ID       = '1398482942849712148';
const CATEGORY_PARTNER_ID      = '1398482923803508776';
const WELCOME_CHANNEL_ID       = '1398482979063337057';
const SANCTION_CHANNEL_ID      = '1398482972864413747';
const PARTNERSHIP_CHANNEL_ID   = '1398483008624791742';
const OUR_LIST_CHANNEL_ID      = '1360020461303365753';

// Nouvelles catégories de tickets
const CATEGORY_OWNER_ID        = '1398482917344280647';
const CATEGORY_PARTNER_ID2     = '1398482919554678854';
const CATEGORY_STAFF_ID        = '1398482918317359164';
const CATEGORY_ABUS_ID         = '1398482920556986449';

// Catégories où les invitations sont autorisées
const ALLOWED_INVITE_CATEGORIES = [
  CATEGORY_PARTNER_ID,
  CATEGORY_OWNER_ID,
  CATEGORY_STAFF_ID,
  CATEGORY_ABUS_ID,
  CATEGORY_PARTNER_ID2
];

// Rôles notifications
const ROLE_GIVEAWAYS           = '1391239648965169222';
const ROLE_PARTNERS            = '1391238400236851322';
const ROLE_SONDAGES            = '1391424936005865693';
const ROLE_REVIVE_CHAT_ID      = '1391238103162949792';

// Rôles soutien
const ROLE_SAYURI              = '1391243362585280614';
const ROLE_BOOSTER             = '1391203122218799127';

// Rôles de support pour chaque type de ticket
const ROLE_OWNER_SUPPORT       = '1401307222981738679';
const ROLE_PARTNER_SUPPORT     = '1391225937659564123';
const ROLE_STAFF_SUPPORT       = '1391225171041583224';
const ROLE_ABUS_SUPPORT        = '1391225653831143484';

// Rôle “owner” autorisé à +lock / +unlock / +renew / +gw
const ROLE_OWNER               = '1400818653150314626';

// Catégorie giveaways
const GIVEAWAY_CATEGORY_ID     = '1398482905084461088';
const GIVEAWAY_EMOJI           = '1363172548702896348';

// Couleurs
const COLOR_DEFAULT            = 0x3AADFA;
const COLOR_HELP               = 0x3AADFA;
const COLOR_ERROR              = 0xFF5555;
const COLOR_MUTE               = 0x3AADFA;
const COLOR_ANTI               = 0x3AADFA;
const COLOR_RULES              = 0x3AADFA;

// Questions relance discussion
const QUESTIONS = [
  'Quel est votre personnage d’animé préféré ?',
  'Quel jeu vidéo vous fait le plus vibrer en ce moment ?',
  'Quel est votre plat préféré à partager entre amis ?',
  'Quelle chanson n’arrêtez-vous pas d’écouter ?',
  'Si vous pouviez voyager n’importe où demain, où iriez-vous ?',
  'Quel est votre film de tous les temps ?',
  'Quel super-pouvoir aimeriez-vous avoir ?',
  'Plutôt café ou thé pour démarrer la journée ?',
  'Quel est votre livre préféré ?',
  'Si vous deviez apprendre un instrument, lequel choisiriez-vous ?',
  'Quel est votre hobby secret ?',
  'Quelle série binge-watchez-vous en ce moment ?',
  'Plutôt montagne ou plage pour les vacances ?',
  'Quel est votre animal préféré ?',
  'Quelle est votre saison préférée et pourquoi ?',
  'Quel est le dernier bon restaurant que vous avez testé ?',
  'Quel gadget technologique vous fait envie ?',
  'Quel métier auriez-vous voulu exercer enfant ?',
  'Quel est votre jeu de société favori ?',
  'Quelle appli utilisez-vous le plus sur votre téléphone ?',
  'Quel est votre souvenir de voyage le plus mémorable ?',
  'Si vous pouviez rencontrer une célébrité, qui serait-ce ?',
  'Quel est votre défi personnel actuel ?',
  'Quelle est votre citation favorite ?',
  'Préférez-vous lire un livre ou regarder un film pour vous détendre ?',
  'Quelle est votre activité sportive préférée ?',
  'Quel est votre snack favori devant une série ?',
  'Quelle langue aimeriez-vous apprendre ?',
  'Quel est le dernier défi cuisine que vous avez relevé ?',
  'Plutôt lever tôt ou faire la grasse matinée ?'
];
let questionIndex = 0;
let lastPingAt = 0;

// Snipe & anti-spam
const deletedMessages = [];
const spamTimestamps = new Map();

// Anti-abus de ban
const banTimestamps = new Map();

// Warns en mémoire
const warns = new Map();

// Permissions surchargées par rôle
const OVERRIDE_PERMS = {
  '1391224485612486747': ['*'],
  '1391224615770132511': ['ban','unban','timeout','untimeout','warn','sanction','addrole','removerole'],
  '1391225883146194955': ['ban','unban','timeout','untimeout','warn','sanction'],
  '1391225829673009192': ['timeout','untimeout','warn','sanction'],
  '1391225758281764924': ['timeout','untimeout','warn','sanction'],
  '1391225714266738819': ['warn','sanction'],
  '1391225323168727092': ['addrole','removerole'],
  '1391225390953009212': ['addrole','removerole'],
  '1391225466857197639': ['addrole','removerole'],
  '1391225601721110620': ['addrole','removerole']
};
function hasOverride(member, cmd) {
  for (const [roleId, cmds] of Object.entries(OVERRIDE_PERMS)) {
    if (!member.roles.cache.has(roleId)) continue;
    if (cmds.includes('*') || cmds.includes(cmd)) return true;
  }
  return false;
}

// Utilitaire d’erreur éphémère
async function sendEphemeralError(channel, content, userMessage) {
  const e = new EmbedBuilder().setColor(COLOR_ERROR).setDescription(content);
  const m = await channel.send({ embeds: [e] });
  setTimeout(() => m.delete().catch(() => {}), 5000);
  if (userMessage?.deletable) setTimeout(() => userMessage.delete().catch(() => {}), 5000);
}


// ---------- SYSTÈME +DMALL MULTI-SERVEUR ----------
const DMED_FILE = path.join(__dirname, 'dmed.json');

function loadDMedMap() {
  if (!fs.existsSync(DMED_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(DMED_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveDMedMap(map) {
  fs.writeFileSync(DMED_FILE, JSON.stringify(map, null, 2), 'utf-8');
}

const ANNOUNCE_MESSAGE = (member) => 
  `**Hey <@${member.id}> !**  
# on decale ici l'autre serveur est fermé  

https://discord.gg/es3xpmqmDb`;

async function dmAllMembers(guild) {
  const map = loadDMedMap();
  const guildId = guild.id;
  if (!map[guildId]) map[guildId] = [];

  await guild.members.fetch();

  for (const member of guild.members.cache.values()) {
    if (
      member.user.bot ||
      map[guildId].includes(member.id) ||
      member.permissions.has(PermissionFlagsBits.BanMembers) ||
      member.permissions.has(PermissionFlagsBits.KickMembers) ||
      member.permissions.has(PermissionFlagsBits.ManageRoles) ||
      member.permissions.has(PermissionFlagsBits.ModerateMembers)
    ) continue;

    try {
      await member.send(ANNOUNCE_MESSAGE(member));
      map[guildId].push(member.id);
      saveDMedMap(map);
    } catch (err) {
      console.error(`Impossible de DM ${member.user.tag}:`, err);
    }
  }

  return `✅ DMs envoyés à ${map[guildId].length} membres (hors bots et staff) de **${guild.name}**.`;
}


// ---------- CLIENT DISCORD ----------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ---------- READY & EMBEDS INIT ----------
client.once('ready', () => {
  console.log('Connecté en tant que ' + client.user.tag + ' sur "' + GUILD_NAME + '"');

  // Embed notifications
  (async () => {
    const notifChannel = client.channels.cache.get(NOTIF_CHANNEL_ID);
    if (notifChannel?.isTextBased()) {
      const fetched = await notifChannel.messages.fetch({ limit: 50 });
      const already = fetched.some(m =>
        m.embeds[0]?.title === '🔔 ・__# Rôles Notifications__' && m.author?.bot
      );
      if (!already) {
        const embedNotif = new EmbedBuilder()
          .setColor(COLOR_DEFAULT)
          .setThumbnail('https://i.imgur.com/E0uDWp9.jpeg')
          .setTitle('<a:emoji_2:1391582106077106227> ・__Rôles Notifications__')
          .setDescription(
            '<a:emoji_1:1391504087199125626> Cliquez sur la réaction de la notification que vous souhaitez recevoir.\n\n' +
            '🎉・<@&' + ROLE_GIVEAWAYS + '>\n' +
            '🤝・<@&' + ROLE_PARTNERS + '>\n' +
            '📊・<@&' + ROLE_SONDAGES + '>\n' +
            '🛎️・<@&' + ROLE_REVIVE_CHAT_ID + '>\n\n' +
            '𝘊𝘦𝘤𝘪 𝘯𝘰𝘶𝘴 𝘱𝘦𝘳𝘮𝘦𝘵𝘵𝘳𝘢 𝘥𝘦 𝘧𝘢𝘪𝘳𝘦 𝘣𝘦𝘢𝘶𝘤𝘰𝘶𝘱 𝘮𝘰𝘪𝘯𝘴 𝘥𝘦 𝘱𝘪𝘯𝘨𝘴 𝘢𝘣𝘶𝘴𝘪𝘧 @here & @everyone !'
          )
          .setFooter({ text: ' ', iconURL: 'https://i.imgur.com/cRHZDL8.png' });
        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('notificationRoles')
            .setPlaceholder('Faites votre choix')
            .setMinValues(1)
            .setMaxValues(4)
            .addOptions([
              { label: 'Giveaways', value: ROLE_GIVEAWAYS, emoji: '🎉' },
              {	label: 'Partenariats', value: ROLE_PARTNERS, emoji: '🤝' },
              {	label: 'Sondages', value: ROLE_SONDAGES, emoji: '📊' },
              {	label: 'Revive Chat', value: ROLE_REVIVE_CHAT_ID, emoji: '🛎️' }
            ])
        );
        await notifChannel.send({ embeds: [embedNotif], components: [row] });
      }
    }
  })();

  // Embed soutien
  (async () => {
    const soutienCh = client.channels.cache.get(SOUTIEN_CHANNEL_ID);
    if (soutienCh?.isTextBased()) {
      const fetched = await soutienCh.messages.fetch({ limit: 50 });
      const already = fetched.some(m =>
        m.embeds[0]?.title === '🎀・soutien' && m.author?.bot
      );
      if (!already) {
        const embedSoutien = new EmbedBuilder()
          .setColor(COLOR_DEFAULT)
          .setThumbnail('https://i.imgur.com/E0uDWp9.jpeg')
          .setTitle('🎀・soutien')
          .setDescription(
            '> Afin de soutenir **l\'ensemble du serveur,** nous t\'invitons à __boost__ ou à mettre en statut /𝙾𝚕𝚒𝚊.\n\n' +
            '• En mettant /𝙾𝚕𝚒𝚊 dans ton statut s\'ajoutera automatiquement ce rôle <@&' + ROLE_SAYURI + '> afin de te remercier.\n\n' +
            '• Si tu **boost** le serveur s\'ajoutera aussi automatiquement ce rôle <@&' + ROLE_BOOSTER + '> !\n\n' +
            '𝙲𝚎𝚜 𝚌𝚘𝚗𝚝𝚛𝚒𝚋𝚞𝚝𝚒𝚘𝚗 𝘱𝘦𝘳𝘮𝘦𝘵𝘵𝘵𝘳𝘰𝘯𝘵 𝘥𝘦 𝘧𝘢𝘪𝘳𝘦 𝘮𝘪𝘦𝘶𝘹 𝘢𝘷𝘢𝘯𝘤𝘦𝘳 𝘭𝘦 𝚜𝚎𝚛𝚟𝚎𝚞𝚛 𝘦𝘵 𝘥𝘦 𝘭𝘦 𝘧𝘢𝘪𝘳𝘦 𝘤𝘰𝘯𝘯𝘢𝘪𝘵𝘳𝘦 !'
          )
          .setFooter({ text: ' ', iconURL: 'https://i.imgur.com/QarwX4V.png' });
        await soutienCh.send({ embeds: [embedSoutien] });
      }
    }
  })();

  // Menu ticket initial
  const ticketChannel = client.channels.cache.get(TICKET_CHANNEL_ID);
  if (ticketChannel?.isTextBased()) {
    ticketChannel.messages.fetch({ limit: 50 }).then(msgs => {
      if (!msgs.some(m => m.embeds[0]?.title === '**Support Ticket**' && m.author?.bot)) {
        const menu = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('ticketSelectMenu')
            .setPlaceholder('Faites un choix')
            .addOptions([
              { label: '🔧 | Devenir Staff', value: 'staff', description: 'Rejoindre l’équipe Staff' },
              { label: '⚠️ | Sécurité & Signalements', value: 'signalement', description: 'Signaler un utilisateur' },
              { label: '🤝 | Partenariats & Communauté', value: 'partenariat', description: 'Proposer un partenariat' },
              { label: '👑 | Ticket Owner', value: 'owner', description: 'Contacter un Owner' }
            ])
        );
        const embed = new EmbedBuilder()
          .setColor(COLOR_DEFAULT)
          .setThumbnail('https://i.imgur.com/E0uDWp9.jpeg')
          .setTitle('**Support Ticket**')
          .setDescription(
            'Avant de soumettre votre demande, sélectionnez la raison dans le menu ci-dessous.\n' +
            'Nous pourrons orienter votre ticket plus rapidement.'
          );
        ticketChannel.send({ embeds: [embed], components: [menu] });
      }
    }).catch(() => {});
  }

  // —> Système de relance discussion désactivé
  /*
  setInterval(async () => {
    const channel = client.channels.cache.get(DISCUSSION_CHANNEL_ID);
    if (!channel?.isTextBased()) return;
    const last = (await channel.messages.fetch({ limit: 1 }).catch(() => null))?.first();
    if (!last) return;
    const now = Date.now();
    if (now - last.createdTimestamp >= 1800000 && lastPingAt < last.createdTimestamp) {
      const q = QUESTIONS[questionIndex % QUESTIONS.length];
      questionIndex++;
      channel.send('<@&' + ROLE_REVIVE_CHAT_ID + '> ' + q);
      lastPingAt = now;
    }
  }, 1800000);
  */
});


// ---------- INTERACTIONS (notifications, tickets & gw) ----------
client.on('interactionCreate', async interaction => {
  // Notifications roles
  if (interaction.isStringSelectMenu() && interaction.customId === 'notificationRoles') {
    const chosen = interaction.values;
    const member = interaction.member;
    const all = [ROLE_GIVEAWAYS, ROLE_PARTNERS, ROLE_SONDAGES, ROLE_REVIVE_CHAT_ID];
    for (const rid of all) {
      if (member.roles.cache.has(rid) && !chosen.includes(rid)) {
        await member.roles.remove(rid).catch(() => {});
      }
    }
    for (const rid of chosen) {
      if (!member.roles.cache.has(rid)) {
        await member.roles.add(rid).catch(() => {});
      }
    }
    return interaction.reply({ content: '✅ Vos rôles ont été mis à jour !', flags: 64 });
  }

  // Ticket select
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticketSelectMenu') {
    const choix = interaction.values[0];
    let categoryId, supportRoleId;
    switch (choix) {
      case 'owner':
        categoryId    = CATEGORY_OWNER_ID; supportRoleId = ROLE_OWNER_SUPPORT; break;
      case 'partenariat':
        categoryId    = CATEGORY_PARTNER_ID2; supportRoleId = ROLE_PARTNER_SUPPORT; break;
      case 'staff':
        categoryId    = CATEGORY_STAFF_ID; supportRoleId = ROLE_STAFF_SUPPORT; break;
      case 'signalement':
        categoryId    = CATEGORY_ABUS_ID; supportRoleId = ROLE_ABUS_SUPPORT; break;
      default:
        return interaction.reply({ content: 'Choix invalide.', flags: 64 });
    }
    const guild = interaction.guild;
    const user  = interaction.user;
    const everyoneRole = guild.roles.everyone;
    const memberUser   = await guild.members.fetch(user.id).catch(() => null);
    const supportRole  = guild.roles.cache.get(supportRoleId);
    if (!memberUser || !supportRole) {
      return interaction.reply({ content: '❌ Erreur interne.', flags: 64 });
    }
    const channel = await guild.channels.create({
      name: `ticket-${user.username}`.toLowerCase().slice(0,20),
      type: 0,
      parent: categoryId,
      permissionOverwrites: [
        { id: everyoneRole.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: memberUser.id,   allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        { id: supportRole.id,  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
      ]
    });
    const embed = new EmbedBuilder()
      .setColor(COLOR_DEFAULT)
      .setTitle(`Ticket ouvert par ${user.username}`)
      .setDescription('• Merci d\'avoir contacté le support\n• Décrivez votre problème puis attendez une réponse');
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('closeTicket').setLabel('🔒 Fermer').setStyle(ButtonStyle.Danger)
    );
    await channel.send({ content: `<@&${supportRole.id}>`, embeds: [embed], components: [row] });
    return interaction.reply({ content: `Votre ticket a été créé : ${channel}`, flags: 64 });
  }

  // Fermeture ticket
  if (interaction.isButton() && interaction.customId === 'closeTicket') {
    await interaction.reply({ content: '🔒 Suppression du ticket…', flags: 64 });
    setTimeout(() => interaction.channel.delete().catch(() => {}), 1000);
  }

  // Participation au giveaway
  if (interaction.isButton() && interaction.customId === 'gw_participate') {
    const gw = giveaways.get(interaction.message.id);
    if (!gw) return interaction.reply({ content: '❌ Ce giveaway est terminé.', flags: 64 });
    if (gw.participants.has(interaction.user.id)) {
      return interaction.reply({ content: 'Vous participez déjà !', flags: 64 });
    }
    gw.participants.add(interaction.user.id);
    return interaction.reply({ content: '✅ Vous êtes inscrit au giveaway !', flags: 64 });
  }
});

// ---------- PRÉSENCE /𝚂𝚊𝚢𝚞𝚛𝚒 — gestion du rôle basé sur le statut ----------
client.on('presenceUpdate', (oldP, newP) => {
  const oldState = oldP?.activities.find(a => a.type === ActivityType.Custom)?.state || '';
  const newState = newP.activities.find(a => a.type === ActivityType.Custom)?.state || '';
  const member = newP.member;
  if (!member || member.user.bot) return;
  const had = oldState.toLowerCase().includes('/olia');
  const has = newState.toLowerCase().includes('/olia');
  if (!had && has) member.roles.add(ROLE_SAYURI).catch(() => {});
  if (had && !has) member.roles.remove(ROLE_SAYURI).catch(() => {});
});

// ---------- BIENVENUE — nouveau texte ----------
client.on('guildMemberAdd', member => {
  if (member.user.bot) return;
  const ch = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!ch?.isTextBased()) return;
  const texte = [
    `Bienvenue <@${member.id}> sur **Olia 👒** !`,
    `Nous sommes **${member.guild.memberCount}** membres, grâce à toi !`,
    `-# **/Olia en statut pour avoir la perm image**`
  ].join('\n');
  ch.send({ content: texte });
});

// ---------- SNIPE ----------
client.on('messageDelete', msg => {
  if (!msg.guild || msg.author.bot || !msg.content) return;
  deletedMessages.unshift({
    authorTag: msg.author.tag,
    content: msg.content,
    channel: msg.channel.name,
    deletedAt: Date.now()
  });
  if (deletedMessages.length > 100) deletedMessages.pop();
});

// ---------- COMMANDES & MODÉRATION ----------
client.on('messageCreate', async message => {
  if (!message.guild) return;
  const member = message.member;
  const err = txt => sendEphemeralError(message.channel, txt, message);

  // +dmall
  if (message.content.trim() === '+dmall') {
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('🚫 Vous devez être administrateur pour utiliser cette commande.');
    }
    const statusMsg = await message.channel.send('🚀 Envoi des DMs en cours…');
    try {
      const resultText = await dmAllMembers(message.guild);
      return statusMsg.edit(resultText);
    } catch (err) {
      console.error(err);
      return statusMsg.edit('❌ Une erreur est survenue lors de l’envoi des DMs.');
    }
  }

  // Anti-abus de ban
  if (message.content.startsWith('+ban')) {
    const now = Date.now();
    let arr = banTimestamps.get(member.id) || [];
    arr = arr.filter(t => now - t < 5 * 60 * 1000);
    arr.push(now);
    banTimestamps.set(member.id, arr);
    if (arr.length > 5) {
      await member.ban({ reason: 'Abus de +ban (>5 en 5min)' }).catch(() => {});
      return;
    }
  }

  // Anti-invitation Discord global
  const inviteRegex = /(discord(?:\.gg|\.com\/invite)\/[A-Za-z0-9-]+)/i;
  if (inviteRegex.test(message.content) && !ALLOWED_INVITE_CATEGORIES.includes(message.channel.parentId)) {
    message.delete().catch(() => {});
    const logCh = message.guild.channels.cache.get(SANCTION_CHANNEL_ID);
    if (logCh?.isTextBased()) {
      const alert = new EmbedBuilder()
        .setColor(COLOR_ANTI)
        .setTitle('🚨 Invitation Discord supprimée automatiquement')
        .addFields(
          { name: 'Auteur', value: message.author.tag, inline: true },
          { name: 'Salon',  value: `<#${message.channel.id}>`, inline: true },
          { name: 'Lien',    value: message.content.match(inviteRegex)[0] }
        )
        .setTimestamp();
      logCh.send({ embeds: [alert] }).catch(() => {});
    }
    return;
  }

  // Ignore les bots
  if (message.author.bot) return;

  // Anti-spam
  const nowTime = Date.now();
  const arrSpam = (spamTimestamps.get(member.id) || []).filter(t => nowTime - t < 5000);
  arrSpam.push(nowTime);
  spamTimestamps.set(member.id, arrSpam);
  if (arrSpam.length > 5) {
    const toDel = (await message.channel.messages.fetch({ limit: 50 }))
      .filter(m => m.author.id === member.id);
    message.channel.bulkDelete(toDel, true).catch(() => {});
    member.timeout(5000, 'Spam détecté').catch(() => {});
    const e = new EmbedBuilder().setColor(COLOR_MUTE)  
      .setDescription('⚠️ Spam interdit – timeout 5 s');
    const m = await message.channel.send({ embeds: [e] });
    setTimeout(() => m.delete().catch(() => {}), 5000);
    return;
  }

  // Anti-invite (sections partenaires)
  const inv = /(discord(?:\.gg|app\.com\/invite)\/[A-Za-z0-9-]+)/;
  if (
    inv.test(message.content) &&
    message.channel.id !== PARTNERSHIP_CHANNEL_ID &&
    message.channel.id !== OUR_LIST_CHANNEL_ID &&
    message.channel.parentId !== CATEGORY_PARTNER_ID
  ) {
    message.delete().catch(() => {});
    member.timeout(120000, 'Lien d\'invitation interdit').catch(() => {});
    const e = new EmbedBuilder().setColor(COLOR_ANTI)
      .setDescription('🚫 Lien d\'invitation interdit – timeout 2 m');
    const m = await message.channel.send({ embeds: [e] });
    setTimeout(() => m.delete().catch(() => {}), 5000);
    return;
  }

  // +help
  if (message.content === '+help') {
    const e = new EmbedBuilder()
      .setColor(COLOR_HELP)
      .setThumbnail('https://i.imgur.com/E0uDWp9.jpeg')
      .setTitle('Commandes utiles')
      .setDescription(
        '*Modération*\n' +
        '+ban @user raison\n' +
        '+unban <ID> raison\n' +
        '+timeout @user durée raison\n' +
        '+untimeout @user raison\n' +
        '+warn @user raison\n' +
        '+sanction @user\n\n' +
        '*Rôles*\n' +
        '+addrole @user @role\n' +
        '+removerole @user @role\n\n' +
        '*Général*\n' +
        '+help, +snipe, +clear <n>, +stats, +rules, +lock, +unlock, +renew, +gw'
      );
    return message.channel.send({ embeds: [e] });
  }

  // +rules
  if (message.content === '+rules') {
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) return err('🚫 Permission requise : Administrateur.');
    const e = new EmbedBuilder()
      .setColor(COLOR_RULES)
      .setThumbnail('https://i.imgur.com/E0uDWp9.jpeg')
      .setTitle('📖・Règlement')
      .setDescription(
        '> :sparkles: *Merci de lire attentivement ce règlement afin de garantir une ambiance conviviale et respectueuse sur notre serveur.*\n\n' +
        '__**:pushpin: 1 RÈGLES GÉNÉRALES**__  \n\n' +
        '> ➜ **Sois gentil(le) et poli(e) envers tous les membres.**  \n\n' +
        '> ➜ **Aucune insulte, propos haineux ou provocations ne seront tolérés.**  \n\n' +
        '> ➜ **Les décisions de l’équipe de modération sont à respecter.**  \n\n' +
        '> ➜ **En cas de problème, contacte directement un membre du staff.**  \n\n' +
        '> ➜ **Les Community Guidelines de Discord doivent être respectés.**\n\n' +
        '__**:speech_balloon: 2 SALONS TEXTUELS**__  \n\n' +
        '> ➜ **Poste dans le salon correspondant à ton sujet.**  \n\n' +
        '> ➜ **Consulte la description de chaque salon pour t\'assurer d\'être au bon endroit.**  \n\n' +
        '> ➜ **Pas de spam, flood ou publicité non autorisée.**  \n\n' +
        '> ➜ **Ne divulgue aucune donnée personnelle.**\n\n' +
        '__**:microphone2: 3 SALONS VOCAUX**__  \n\n' +
        '> ➜ **Reste respectueux(se) et évite les nuisances sonores.**  \n\n' +
        '> ➜ **Utilise ton micro et tes écouteurs de manière à garantir une bonne ambiance.**  \n\n' +
        '> ➜ **Le streaming de contenu sensible est interdit.**  \n\n' +
        '> ➜ **Les soundboards et mods vocaux sont interdits sans autorisation.**  \n\n' +
        '> ➜ **En cas de problème ou de nuisance, contacte immédiatement un modérateur.**\n\n' +
        '__**:white_check_mark: 4 DISPOSITIONS FINALES**__  \n\n' +
        '> ➜ **En restant sur le serveur, tu acceptes l’intégralité du règlement.**  \n\n' +
        '> ➜ **Ce règlement pourra être modifié à tout moment pour améliorer l\'expérience.**'
      );
    return message.channel.send({ embeds: [e] });
  }

  // +snipe
  if (message.content === '+snipe') {
    if (!deletedMessages.length) return err('Rien à afficher.');
    const last = deletedMessages[0];
    const e = new EmbedBuilder()
      .setColor(COLOR_DEFAULT)
      .setTitle('🕵️ Dernier Sniped')
      .addFields(
        { name: 'Auteur',  value: last.authorTag, inline: true },
        { name: 'Salon',   value: '#' + last.channel, inline: true },
        { name: 'Contenu', value: last.content.length > 1024
            ? last.content.slice(0, 1021) + '…'
            : last.content }
      )
      .setTimestamp(last.deletedAt);
    return message.channel.send({ embeds: [e] });
  }

  // +effacer / +clear
  if (message.content.startsWith('+effacer') || message.content.startsWith('+clear')) {
    if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) return err('🚫 Vous n\'avez pas la permission nécessaire.');
    const n = parseInt(message.content.split(' ')[1], 10);
    if (isNaN(n) || n < 1 || n > 100) return err('Usage : +effacer <1-100>');
    try {
      const fetched = await message.channel.bulkDelete(n + 1, true);
      const confirm = await message.channel.send(`🧹 ${fetched.size - 1} messages effacés.`);
      setTimeout(() => confirm.delete().catch(() => {}), 5000);
    } catch {
      return err('Impossible d’effacer.');
    }
    return;
  }

  // +stats
  if (message.content === '+stats') {
    const guild = message.guild;
    await guild.members.fetch();
    const total    = guild.memberCount;
    const online   = guild.members.cache.filter(m => ['online','idle','dnd'].includes(m.presence?.status)).size;
    const voice    = guild.members.cache.filter(m => m.voice.channel).size;
    const boosters = guild.premiumSubscriptionCount;
    const e = new EmbedBuilder()
      .setColor(COLOR_DEFAULT)
      .setThumbnail('https://i.imgur.com/E0uDWp9.jpeg')
      .setAuthor({ name: 'Statistiques → Olia 👒' })
      .setDescription(
        `_Membres :_ **${total}**\n` +
        `_En ligne :_ **${online}**\n` +
        `_En vocal :_ **${voice}**\n` +
        `_Boosters :_ **${boosters}**`
      )
      .setFooter({ text: 'Olia 👒', iconURL: 'https://i.imgur.com/E0uDWp9.jpeg' });
    return message.channel.send({ embeds: [e] });
  }

  // +lock
  if (message.content === '+lock') {
    if (!member.roles.cache.has(ROLE_OWNER)) return err('🚫 Vous n\'avez pas la permission nécessaire.');
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
    return message.channel.send('✅ Le salon est désormais verrouillé.');
  }

  // +unlock
  if (message.content === '+unlock') {
    if (!member.roles.cache.has(ROLE_OWNER)) return err('🚫 Vous n\'avez pas la permission nécessaire.');
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
    return message.channel.send('✅ Le salon est désormais ouvert.');
  }

  // +renew
  if (message.content === '+renew') {
    if (!member.roles.cache.has(ROLE_OWNER)) return err('🚫 Vous n\'avez pas la permission nécessaire.');
    const oldChannel = message.channel;
    const guild = message.guild;
    const name = oldChannel.name;
    const type = oldChannel.type;
    const parent = oldChannel.parentId;
    const overwrites = oldChannel.permissionOverwrites.cache.map(o => ({
      id: o.id,
      allow: o.allow.toArray(),
      deny: o.deny.toArray()
    }));
    await oldChannel.delete().catch(() => {});
    const newChannel = await guild.channels.create({ name, type, parent, permissionOverwrites: overwrites });
    return newChannel.send('✅ Salon recréé avec succès.');
  }

  // +gw <récompense> x<nb> <durée>
  if (message.content.startsWith('+gw ')) {
    if (!member.roles.cache.has(ROLE_OWNER)) return err('🚫 Permission requise : rôle Owner.');
    if (message.channel.parentId !== GIVEAWAY_CATEGORY_ID) return err('Cette commande doit être utilisée dans un salon de la catégorie Giveaways.');
    await message.delete().catch(() => {});
    const parts = message.content.trim().split(/\s+/);
    if (parts.length < 4) return err('Usage : +gw <récompense> x<nb> <durée>');
    const durationRaw = parts.pop();
    const xPart       = parts.pop();
    const reward      = parts.slice(1).join(' ');
    const matchX      = xPart.match(/^x(\d+)$/i);
    if (!matchX) return err('Format du nombre de gagnants invalide (ex : x3).');
    const winnersCount = parseInt(matchX[1], 10);
    const dm = durationRaw.match(/^(\d+)([mh])$/i);
    if (!dm) return err('Durée invalide (ex : 30m,1h).');
    const ms = parseInt(dm[1], 10) * (dm[2].toLowerCase() === 'm' ? 60000 : 3600000);
    const humanInitial = dm[2].toLowerCase() === 'm' ? `${dm[1]} minute(s)` : `${dm[1]} heure(s)`;
    const endTimestamp = Date.now() + ms;
    const gwEmbed = new EmbedBuilder()
      .setColor(COLOR_DEFAULT)
      .setTitle(`🎉 Giveaway : ${reward}`)
      .setDescription(`Cliquez sur le bouton ci-dessous pour participer !`)
      .addFields({ name: 'Fin du giveaway', value: `Dans ${humanInitial}` })
      .setFooter({ text: `Nombre de gagnant(s) : ${winnersCount}` });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('gw_participate').setEmoji('🎉').setLabel('Participer').setStyle(ButtonStyle.Secondary)
    );
    const gwMessage = await message.channel.send({ embeds: [gwEmbed], components: [row] });
    await gwMessage.react(`<:icon_2giveaway_party:${GIVEAWAY_EMOJI}>`).catch(() => {});
    const participants = new Set();
    const updateInterval = setInterval(async () => {
      const remaining = endTimestamp - Date.now();
      if (remaining <= 0) return;
      const minutesLeft = Math.ceil(remaining / 60000);
      const newEmbed = EmbedBuilder.from(gwEmbed).setFields({ name:'Fin du giveaway', value:`Dans ${minutesLeft} minute(s)` });
      await gwMessage.edit({ embeds: [newEmbed] });
    }, 60000);
    const timeout = setTimeout(async () => {
      clearInterval(updateInterval);
      giveaways.delete(gwMessage.id);
      const users = Array.from(participants);
      const winners = [];
      while (winners.length < winnersCount && users.length > 0) {
        const idx = Math.floor(Math.random() * users.length);
        winners.push(users.splice(idx, 1)[0]);
      }
      const winEmbed = new EmbedBuilder()
        .setColor(COLOR_DEFAULT)
        .setTitle('🎉 Gagnant(s) du giveaway')
        .setDescription(winners.length ? winners.map(id => `<@${id}>`).join('\n') : 'Personne n’a participé.');
      await message.channel.send({ embeds: [winEmbed] });
    }, ms);
    giveaways.set(gwMessage.id, { endTimestamp, winnersCount, participants, updateInterval, timeout });
    return;
  }

  // Gestion des commandes de modération et rôles
  if (message.content.startsWith('+')) {
    const [cmd, ...args] = message.content.slice(1).trim().split(/\s+/);

    // +ban
    if (cmd === 'ban') {
      const m = args[0]?.match(/^<@!?(\d+)>$/);
      const reason = args.slice(1).join(' ').trim();
      if (!m || !reason) return err('Usage : +ban @user raison');
      const target = await message.guild.members.fetch(m[1]).catch(() => null);
      if (!target) return err('Membre introuvable.');
      await target.ban({ reason }).catch(() => err('❌ Échec du ban.'));
      const e = new EmbedBuilder()
        .setColor(COLOR_ANTI)
        .setDescription(`<@${target.id}> a été ban du serveur\nRaison : **${reason}**`);
      return message.channel.send({ embeds: [e] });
    }

    // +unban
    if (cmd === 'unban') {
      const id = args[0];
      const reason2 = args.slice(1).join(' ').trim();
      if (!id || !reason2) return err('Usage : +unban <ID> raison');
      await message.guild.bans.remove(id, reason2).catch(() => err('❌ Échec du unban.'));
      const e2 = new EmbedBuilder()
        .setColor(COLOR_DEFAULT)
        .setDescription(`<@${id}> a été unban\nRaison : **${reason2}**`);
      return message.channel.send({ embeds: [e2] });
    }

    // +timeout
    if (cmd === 'timeout') {
      const m = args[0]?.match(/^<@!?(\d+)>$/);
      const dur = args[1];
      const reason3 = args.slice(2).join(' ').trim();
      if (!m || !dur || !reason3) return err('Usage : +timeout @user durée raison');
      const target = await message.guild.members.fetch(m[1]).catch(() => null);
      if (!target) return err('Membre introuvable.');
      const dm = dur.match(/^(\d+)(s|m|h)$/);
      if (!dm) return err('Durée invalide (ex : 10s,5m,1h).');
      const ms2 = parseInt(dm[1], 10) * (dm[2] === 's' ? 1000 : dm[2] === 'm' ? 60000 : 3600000);
      await target.timeout(ms2, reason3).catch(() => err('❌ Échec du timeout.'));
      const e3 = new EmbedBuilder()
        .setColor(COLOR_MUTE)
        .setDescription(`<@${target.id}> a été mute pour **${dur}**\nRaison : **${reason3}**`);
      message.channel.send({ embeds: [e3] });
      const dmEmbed = new EmbedBuilder()
        .setColor(COLOR_MUTE)
        .setTitle('Vous avez été rendu muet')
        .setDescription(`<@${target.id}>, vous avez été rendu muet sur Olia 👒 pour une durée de **${dur}**\nRaison : **${reason3}**`);
      return target.send({ embeds: [dmEmbed] }).catch(() => {});
    }

    // +untimeout
    if (cmd === 'untimeout') {
      const m = args[0]?.match(/^<@!?(\d+)>$/);
      const reason4 = args.slice(1).join(' ').trim() || 'Aucune raison';
      if (!m) return err('Usage : +untimeout @user [raison]');
      const target = await message.guild.members.fetch(m[1]).catch(() => null);
      if (!target) return err('Membre introuvable.');
      await target.timeout(null, reason4).catch(() => err('❌ Échec du untimeout.'));
      const e4 = new EmbedBuilder()
        .setColor(0x55FF55)
        .setTitle('Démute')
        .addFields(
          { name: 'Utilisateur', value: `<@${target.id}>`, inline: true },
          { name: 'Par',         value: `<@${member.id}>`, inline: true },
          { name: 'Raison',      value: reason4 }
        );
      message.channel.send({ embeds: [e4] });
      const dmEmbed2 = new EmbedBuilder()
        .setColor(0x55FF55)
        .setTitle('Vous avez été démute')
        .setDescription(`Raison : ${reason4}`);
      return target.send({ embeds: [dmEmbed2] }).catch(() => {});
    }

    // +warn
    if (cmd === 'warn') {
      const m = args[0]?.match(/^<@!?(\d+)>$/);
      const reason5 = args.slice(1).join(' ').trim();
      if (!m || !reason5) return err('Usage : +warn @user raison');
      const uid = m[1];
      if (!warns.has(uid)) warns.set(uid, []);
      warns.get(uid).push({ by: member.id, reason: reason5, at: Date.now() });
      const e5 = new EmbedBuilder()
        .setColor(COLOR_ERROR)
        .setDescription(`<@${uid}> a été warn\nRaison : **${reason5}**`);
      message.channel.send({ embeds: [e5] });
      const dmEmbed3 = new EmbedBuilder()
        .setColor(COLOR_ERROR)
        .setTitle('Vous avez été warn')
        .setDescription(`<@${uid}>, vous avez été warn sur Olia 👒\nRaison : **${reason5}**`);
      message.guild.members.fetch(uid)
        .then(u => u.send({ embeds: [dmEmbed3] }).catch(() => {}))
        .catch(() => {});
      return;
    }

    // +sanction
    if (cmd === 'sanction') {
      const m = args[0]?.match(/^<@!?(\d+)>$/);
      if (!m) return err('Usage : +sanction @user');
      const uid2 = m[1];
      const list = warns.get(uid2) || [];
      const e6 = new EmbedBuilder()
        .setColor(COLOR_DEFAULT)
        .setTitle(`Historique des sanctions de <@${uid2}>`)
        .setDescription(
          list.length
            ? list.map((w, i) => `${i+1}. Par <@${w.by}> – ${new Date(w.at).toLocaleDateString('fr-FR')} – ${w.reason}`).join('\n')
            : 'Aucune sanction trouvée.'
        );
      return message.channel.send({ embeds: [e6] });
    }

    // +addrole / +removerole
    if (['addrole','removerole'].includes(cmd)) {
      const [u, r] = args;
      const um = u?.match(/^<@!?(\d+)>$/);
      const rm = r?.match(/^<@&(\d+)>$/);
      if (!um || !rm) return err(`Usage : +${cmd} @user @role`);
      const target = await message.guild.members.fetch(um[1]).catch(() => null);
      const role   = message.guild.roles.cache.get(rm[1]);
      if (!target || !role) return err('Introuvable.');
      try {
        await (cmd === 'addrole' ? target.roles.add(role) : target.roles.remove(role));
      } catch {
        return err('❌ Échec.');
      }
      const e7 = new EmbedBuilder()
        .setColor(COLOR_DEFAULT)
        .setDescription(`<@${target.id}> ${cmd==='addrole'?'a reçu le rôle':'a perdu le rôle'} <@&${role.id}>\nPar : <@${member.id}>`);
      return message.channel.send({ embeds: [e7] });
    }
  }
});

// ---------- Express & login ----------
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (_req, res) => res.send('🤖 Bot Discord en fonctionnement'));
app.listen(PORT, () => console.log(`Serveur Web lancé sur le port ${PORT}`));

const token = process.env.DISCORD_TOKEN;
if (!token) console.error('❌ AUCUN DISCORD_TOKEN trouvé dans process.env !');
else console.log('✅ DISCORD_TOKEN chargé :', token.slice(0,4) + '…' + token.slice(-4));

client.login(token).catch(err => console.error('❌ Échec de connexion :', err));
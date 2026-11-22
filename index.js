require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  AttachmentBuilder
} = require("discord.js");

const path = require("path");

// =================================
// CONFIGURAÇÃO DO BOT
// =================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});
const tickets = new Map();
const MAX_TICKETS = 10;

// Limpa automaticamente quando um canal é excluído
client.on('channelDelete', async (canal) => {
  for (const [usuarioId, canalId] of tickets.entries()) {
    if (canalId === canal.id) {
      tickets.delete(usuarioId);
      break;
    }
  }
});

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  throw new Error("Configure o arquivo .env corretamente!");
}

// =================================
// CONFIGURAÇÕES ECLIPSE
// =================================

const valores = [
  "0.50",
  "0.75",
  "1.00",
  "3.00",
  "5.00",
  "10.00",
  "50.00",
  "100.00"
];

const modos = {
  normal: "Gelo Normal",
  infinito: "Gelo Infinito"
};

const logoPath = path.join(
  __dirname,
  "imagens",
  "logo-eclipse.png"
);

// ⚠️ Coloque sua segunda imagem na pasta "imagens" com o nome: imagem-lado.png
const imagemLadoPath = path.join(
  __dirname,
  "imagens",
  "imagem-lado.png"
);

// =================================
// SISTEMA DE FILAS
// =================================

const filas = new Map();

function chave(valor, modo) {
  return `${valor}|${modo}`;
}

function obterFila(valor, modo) {
  const key = chave(valor, modo);
  if (!filas.has(key)) filas.set(key, []);
  return filas.get(key);
}

// =================================
// EMBED DOS PAINÉIS — COM A LOGO! 🐺
// =================================

function criarEmbed(valor) {
  const participantes = [];
  for (const [modo, nome] of Object.entries(modos)) {
    const fila = obterFila(valor, modo);
    for (const jogador of fila) {
      participantes.push(`👤 <@${jogador}> — ${nome}`);
    }
  }
  const listaJogadores = participantes.length
    ? participantes.join("\n")
    : "Nenhum jogador na fila";

  const logo = new AttachmentBuilder(logoPath, { name: "logo-eclipse.png" });
  const imagemLado = new AttachmentBuilder(imagemLadoPath, { name: "imagem-lado.png" });

  return {
    embeds: [
      new EmbedBuilder()
        .setColor("#D4A017")
        .setTitle("1x1 | ECLIPSE E-SPORTS")
        .setDescription(
          `🎮 **Modo:**\n` +
          `1x1 Mobile\n\n` +
          `💰 **Valor:**\n` +
          `R$ ${valor.replace(".", ",")}\n\n` +
          `👤 **Jogadores:**\n` +
          `${listaJogadores}`
        )
        .setThumbnail("attachment://logo-eclipse.png") // 🐺 Sua logo aqui!
        .setImage("attachment://imagem-lado.png")
        .setFooter({ text: "ECLIPSE E-SPORTS • Sistema de filas" })
    ],
    components: [criarBotoes(valor)],
    files: [logo, imagemLado]
  };
}

// =================================
// BOTÕES DOS PAINÉIS
// =================================

function criarBotoes(valor) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`entrar|${valor}|normal`)
      .setLabel("Gelo Normal")
      .setEmoji("🧊")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`entrar|${valor}|infinito`)
      .setLabel("Gelo Infinito")
      .setEmoji("🧊")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`sair|${valor}`)
      .setLabel("Sair da fila")
      .setEmoji("🚫")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("abrir_ticket")
      .setLabel("✅ Jogar")
      .setStyle(ButtonStyle.Success)
  );
}

// =================================
// COMANDOS SLASH
// =================================

const comandoPainel = new SlashCommandBuilder()
  .setName("painel-filas")
  .setDescription("Criar os painéis da ECLIPSE AP")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const comandoAnunciar = new SlashCommandBuilder()
  .setName("anunciar-filas")
  .setDescription("Anuncia as filas com @everyone após 30 minutos")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption(option =>
    option.setName("canal")
      .setDescription("Canal onde será feito o anúncio")
      .setRequired(true)
  );

// =================================
// REGISTRAR COMANDOS
// =================================

async function registrarComandos() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: [comandoPainel.toJSON(), comandoAnunciar.toJSON()] }
  );
  console.log("Comandos registrados!");
}

// =================================
// BOT ONLINE
// =================================

client.once("ready", () => {
  console.log("———————————");
  console.log("🐺 ECLIPSE AP ONLINE!");
  console.log(`Bot: ${client.user.tag}`);
  console.log("———————————");
});

// =================================
// INTERAÇÕES
// =================================

client.on("interactionCreate", async interaction => {
  try {
    // ——————————
    // CRIAR PAINÉIS
    // ——————————
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "painel-filas") {
        await interaction.reply({
          content: "🐺 Criando os painéis da ECLIPSE...",
          ephemeral: true
        });

        for (const valor of valores) {
          const dados = criarEmbed(valor);
          await interaction.channel.send(dados);
        }

        await interaction.editReply(
          "✅ Todos os painéis da ECLIPSE AP foram criados!"
        );
        return;
      }

      // ——————————
      // ANÚNCIO COM @everyone APÓS 30 MIN
      // ——————————
      if (interaction.commandName === "anunciar-filas") {
        const canal = interaction.options.getChannel("canal");
        await interaction.reply({
          content: `⏰ Anúncio programado para ${canal} em 30 minutos! ✅`,
          ephemeral: true
        });

        setTimeout(async () => {
          await canal.send({
            content: "@everyone 🔥 **FILAS ABERTAS AGORA!** 🔥\nVenha jogar na ECLIPSE E-SPORTS! Entre na fila e boa sorte! 🐺✨"
          });
        }, 10 * 20 * 30 * 1000);
        return;
      }
    }
    // 🔒 Botão Fechar Ticket
  if (interaction.customId === "fechar_ticket") {
    await interaction.deferUpdate();
    
    const canal = interaction.channel;
    
    if (canal.name.startsWith("jogar-")) {
      await canal.send("🔒 Atendimento fechado. Este canal será excluído em 3 segundos...");
      
      setTimeout(async () => {
        await canal.delete();
        tickets.delete(interaction.user.id);
      }, 3000);
    }
    return;
  }
    // ——————————
    // BOTÕES
    // ——————————
    if (!interaction.isButton()) return;
    const partes = interaction.customId.split("|");
    const acao = partes[0];
    const valor = partes[1];

    // ——————————
    // ✅ BOTÃO JOGAR — ABRIR TICKET
    // ——————————
    if (acao === "abrir_ticket") {
      const usuarioId = interaction.user.id;

      if (tickets.has(usuarioId)) {
        return interaction.reply({
          content: "Sistema lotado! tente novamente em alguns istantes.",
          ephemeral: true
        });
      }

      const categoria = interaction.guild.channels.cache.find(
        c => c.type === 4 && c.name.includes("ATENDIMENTO")
      );

      const canalTicket = await interaction.guild.channels.create({
        name: `jogar-${interaction.user.username}`,
        type: 0,
        parent: categoria?.id,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: ["ViewChannel"] },
          { id: usuarioId, allow: ["ViewChannel", "SendMessages"] },
          { id: CLIENT_ID, allow: ["ViewChannel", "SendMessages"] }
        ]
      });
      // Envia mensagem com botão de fechar dentro do ticket
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const botaoFechar = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId('fechar_ticket')
    .setLabel('🔒 Fechar Atendimento')
    .setStyle(ButtonStyle.Danger)
);

await canalTicket.send({
  content: `Olá ${interaction.user}! 👋\nUm administrador vai te atender em breve.\n\nQuando terminar, é só clicar abaixo:`,
  components: [botaoFechar]
});

await interaction.reply({
  content: `✅ Atendimento aberto! Vá até: ${canalTicket}`,
  ephemeral: true
});

      tickets.set(usuarioId, canalTicket.id);

      await canalTicket.send({
        content: `👋 Olá <@${usuarioId}>!\n\n` +
                 `Bem-vindo à **ECLIPSE E-SPORTS**! 🐺✨\n\n` +
                 `Um administrador vai te atender em breve para organizar sua partida.\n` +
                 `Descreva aqui qual valor e modo você quer jogar! Boa sorte! 🔥`
      });

      await interaction.reply({
        content: `✅ Canal de atendimento criado: ${canalTicket}\nAguarde a resposta da administração! 🐺`,
        ephemeral: true
      });
      return;
    }

    if (!valores.includes(valor)) return;

    // ——————————
    // ENTRAR NA FILA
    // ——————————
    if (acao === "entrar") {
      const modo = partes[2];
      if (!modos[modo]) return;
      const usuario = interaction.user.id;

      let jaEstaNaFila = false;
      for (const fila of filas.values()) {
        if (fila.includes(usuario)) {
          jaEstaNaFila = true;
          break;
        }
      }
      if (jaEstaNaFila) {
        return interaction.reply({
          content: "⚠️ Você já está em uma fila! Saia primeiro.",
          ephemeral: true
        });
      }

      const fila = obterFila(valor, modo);
      if (fila.length >= 2) {
        return interaction.reply({
          content: "❌ Esta fila está completa!",
          ephemeral: true
        });
      }

      fila.push(usuario);
      const dados = criarEmbed(valor);
      await interaction.update(dados);

      // PARTIDA ENCONTRADA
      if (fila.length === 2) {
        const jogador1 = fila[0];
        const jogador2 = fila[1];
        filas.set(chave(valor, modo), []);

        await interaction.channel.send({
          content:
            `🏆 **PARTIDA ENCONTRADA!**\n\n` +
            `🐺 **ECLIPSE E-SPORTS**\n\n` +
            `👤 Jogador 1: <@${jogador1}>\n` +
            `👤 Jogador 2: <@${jogador2}>\n\n` +
            `🎮 Modo: ${modos[modo]}\n` +
            `💰 Valor: R$ ${valor.replace(".", ",")}\n\n` +
            `Aguardem a organização da partida pela equipe!`,
          allowedMentions: { users: [jogador1, jogador2] }
        });

        const dadosAtualizados = criarEmbed(valor);
        await interaction.message.edit(dadosAtualizados);
      }
      return;
    }

    // ——————————
    // SAIR DA FILA
    // ——————————
    if (acao === "sair") {
      const usuario = interaction.user.id;
      let saiu = false;
      for (const modo of Object.keys(modos)) {
        const fila = obterFila(valor, modo);
        const index = fila.indexOf(usuario);
        if (index !== -1) {
          fila.splice(index, 1);
          saiu = true;
        }
      }
      if (!saiu) {
        return interaction.reply({
          content: "⚠️ Você não está em nenhuma fila deste valor!",
          ephemeral: true
        });
      }
      const dados = criarEmbed(valor);
      await interaction.update(dados);
      return;
    }

  } catch (error) {
    console.error("Erro na interação:", error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Ocorreu um erro. Tente novamente.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

// =================================
// INICIALIZAÇÃO
// =================================

async function iniciar() {
  try {
    await registrarComandos();
    await client.login(TOKEN);
  } catch (error) {
    console.error("Erro ao iniciar o ECLIPSE AP:", error);
  }
}

iniciar();
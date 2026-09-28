const {
    Client,
    GatewayIntentBits,
    AuditLogEvent
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

const TOKEN = process.env.DISCORD_TOKEN;

// Guarda os banimentos que o bot já processou
const processados = new Set();

// Guarda a quantidade de banimentos de cada staff
const banimentos = new Map();

function hoje() {
    return new Date().toLocaleDateString("pt-BR");
}

client.once("clientReady", async () => {
    console.log(`✅ Anti-Raid online como ${client.user.tag}`);

    // Inicia o monitoramento
    monitorarBanimentos();
});

async function monitorarBanimentos() {
    try {
        for (const guild of client.guilds.cache.values()) {

            const logs = await guild.fetchAuditLogs({
                type: AuditLogEvent.MemberBanAdd,
                limit: 10
            });

            for (const entrada of logs.entries.values()) {

                // Ignora registros já processados
                if (processados.has(entrada.id)) {
                    continue;
                }

                // Só considera registros recentes
                if (Date.now() - entrada.createdTimestamp > 15000) {
                    processados.add(entrada.id);
                    continue;
                }

                processados.add(entrada.id);

                const staff = entrada.executor;

                if (!staff) {
                    continue;
                }

                // Ignora o próprio bot
                if (staff.id === client.user.id) {
                    continue;
                }

                const data = hoje();

                let dados = banimentos.get(staff.id);

                // Novo dia = contador reiniciado
                if (!dados || dados.data !== data) {
                    dados = {
                        data: data,
                        quantidade: 0
                    };
                }

                dados.quantidade++;

                banimentos.set(staff.id, dados);

                console.log(
                    `🔨 ${staff.tag} realizou o ${dados.quantidade}º banimento do dia.`
                );

                // 3º banimento = expulsão
                if (dados.quantidade === 3) {

                    const membro = await guild.members
                        .fetch(staff.id)
                        .catch(() => null);

                    if (!membro) {
                        console.log(
                            `⚠️ Não encontrei ${staff.tag} no servidor.`
                        );
                        continue;
                    }

                    if (!membro.kickable) {
                        console.log(
                            `❌ Não consigo expulsar ${staff.tag}.`
                        );

                        console.log(
                            "➡️ O cargo do Anti-Raid precisa estar ACIMA do cargo desse staff."
                        );

                        continue;
                    }

                    await membro.kick(
                        "Anti-Raid: 3 banimentos realizados no mesmo dia."
                    );

                    console.log(
                        `🚨 ${staff.tag} FOI EXPULSO após 3 banimentos no dia!`
                    );

                    banimentos.delete(staff.id);
                }
            }
        }

    } catch (erro) {
        console.error("❌ Erro ao verificar Registro de Auditoria:", erro);
    }

    // Verifica novamente em 2 segundos
    setTimeout(monitorarBanimentos, 2000);
}

client.login(TOKEN);
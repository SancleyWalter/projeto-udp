const dgram = require("dgram");
const readline = require("readline");

const SERVER_PORT = 5000;
const SERVER_HOST = "localhost";

function createPromptInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

// Wrapper em Promise que envia um datagrama UDP e aguarda o evento específico de resposta mapeado via JSON
function sendUdpRequest(clientSocket, event, payload, expectedResponseEvent, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const message = Buffer.from(JSON.stringify({ event, payload }));
    
    const onMessage = (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data.event === expectedResponseEvent) {
          cleanup();
          resolve(data.payload);
        }
      } catch (err) {
        // Ignora pacotes corrompidos ou não estruturados que não sejam a resposta esperada
      }
    };

    const onTimeout = setTimeout(() => {
      cleanup();
      reject(new Error("Tempo limite excedido aguardando resposta do servidor via UDP."));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(onTimeout);
      clientSocket.removeListener("message", onMessage);
    };

    clientSocket.on("message", onMessage);
    
    clientSocket.send(message, SERVER_PORT, SERVER_HOST, (err) => {
      if (err) {
        cleanup();
        reject(err);
      }
    });
  });
}

async function main() {
  const clientSocket = dgram.createSocket("udp4");
  const rl = createPromptInterface();

  console.log(`Cliente UDP pronto e configurado para destino -> ${SERVER_HOST}:${SERVER_PORT}`);

  process.on("SIGINT", () => {
    rl.close();
    clientSocket.close();
    process.exit(0);
  });

  while (true) {
    const command = await askQuestion(
      rl,
      '\nDigite comando (resultado/buscar/sair): ',
    );

    const cmd = String(command).trim().toLowerCase();

    if (!cmd || cmd === "sair") {
      break;
    }

    if (cmd === "resultado") {
      const gameName = await askQuestion(rl, 'Nome do jogo (ex: Brasil x França): ');
      try {
        console.log('[udp] -> enviando get_game_result', { to: `${SERVER_HOST}:${SERVER_PORT}`, payload: gameName });
        const response = await sendUdpRequest(clientSocket, "get_game_result", { game_name: gameName }, "game_result_response");
        
        console.log('[udp] <- game_result_response recebido');
        console.log(`Status: ${response.status}`);
        console.log(`Resultado: ${response.result}`);
      } catch (error) {
        console.error("Falha na consulta:", error.message);
      }
      continue;
    }

    if (cmd === "buscar") {
      const query = await askQuestion(rl, 'Pesquisar partidas (ex: brasil x marrocos ou apenas brasil): ');
      const normalized = String(query).trim();
      if (!normalized) {
        console.log('Entrada vazia, pulando.');
        continue;
      }

      console.log('[udp] -> enviando search_match', { to: `${SERVER_HOST}:${SERVER_PORT}`, payload: normalized });
      
      try {
        const resp = await sendUdpRequest(clientSocket, "search_match", { query: normalized }, "search_match_response");
        console.log('[udp] <- search_match_response recebido');
        
        if (Array.isArray(resp.matches) && resp.matches.length) {
          console.log(`Encontradas ${resp.matches.length} partidas:`);
          resp.matches.slice(0, 20).forEach((m) => {
            console.log(`- ${m.title} | ${m.score} | ${m.statusLabel}`);
          });
        } else {
          console.log('Nenhuma partida encontrada para essa consulta.');
        }
      } catch (error) {
        console.error('Erro na busca:', error.message);
      }

      continue;
    }

    console.log('Comando desconhecido. Use "resultado", "buscar" ou "sair".');
  }

  rl.close();
  clientSocket.close();
}

main().catch((error) => {
  console.error("Erro inesperado no cliente:", error);
  process.exit(1);
});
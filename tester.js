const dgram = require("dgram");

const SERVER_PORT = 5000;
const SERVER_HOST = "localhost";

function createClient() {
  // Cria o socket UDP para o cliente
  return dgram.createSocket("udp4");
}

// Em UDP não há handshake de conexão, então validamos se o servidor responde a um comando simples
function pingServer(socket, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const message = Buffer.from(JSON.stringify({ event: "get_world_cup_matches", payload: {} }));
    
    const onMessage = (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data.event === "world_cup_matches_response") {
          cleanup();
          resolve();
        }
      } catch (err) {}
    };

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Não foi possível obter resposta do servidor UDP dentro do tempo limite. O servidor está rodando?"));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timeout);
      socket.removeListener("message", onMessage);
    }

    socket.on("message", onMessage);
    socket.send(message, SERVER_PORT, SERVER_HOST);
  });
}

function requestGameResult(socket, gameName) {
  return new Promise((resolve, reject) => {
    const message = Buffer.from(JSON.stringify({ event: "get_game_result", payload: { game_name: gameName } }));

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Tempo limite aguardando resposta do servidor."));
    }, 5000);

    const onResponse = (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data.event === "game_result_response") {
          cleanup();
          resolve(data.payload);
        }
      } catch (err) {}
    };

    function cleanup() {
      clearTimeout(timeout);
      socket.removeListener("message", onResponse);
    }

    socket.on("message", onResponse);
    socket.send(message, SERVER_PORT, SERVER_HOST, (err) => {
      if (err) {
        cleanup();
        reject(err);
      }
    });
  });
}

async function testSequentialCommunication(socket) {
  console.log("\nTeste 1 - Comunicação Sequencial Iniciada...");

  const r1 = await requestGameResult(socket, "Brasil x Marrocos");
  console.log("Resposta para 'Brasil x Marrocos':", r1.result);

  const r2 = await requestGameResult(socket, "Argentina x França");
  console.log("Resposta para 'Argentina x França':", r2.result);

  const r3 = await requestGameResult(socket, "TimeInexistente x Outro");
  console.log("Resposta para jogo inexistente:", r3.result);
}

async function testBurstRequests(socket) {
  console.log("\nTeste 2 - Volume de Requisições (Burst) Iniciado...");
  
  const totalRequests = 100;
  let receivedResponses = 0;

  const responsesPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Tempo limite aguardando o lote de respostas. Recebidas: ${receivedResponses}/${totalRequests}`));
    }, 10000);

    const onResponse = (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data.event === "game_result_response") {
          receivedResponses += 1;
          if (receivedResponses === totalRequests) {
            cleanup();
            resolve();
          }
        }
      } catch (err) {}
    };

    function cleanup() {
      clearTimeout(timeout);
      socket.removeListener("message", onResponse);
    }

    socket.on("message", onResponse);
  });

  const startTime = Date.now();

  for (let index = 0; index < totalRequests; index += 1) {
    const message = Buffer.from(JSON.stringify({
      event: "get_game_result",
      payload: {
        game_name: index % 2 === 0 ? "Brasil x Marrocos" : "Argentina x França",
      }
    }));
    
    socket.send(message, SERVER_PORT, SERVER_HOST);
  }

  await responsesPromise;
  const totalElapsed = Date.now() - startTime;

  console.log("Teste 2 - Concluído com sucesso!");
  console.log(`Tempo total do lote: ${totalElapsed} ms`);
  console.log(`Quantidade total de respostas recebidas: ${receivedResponses}`);
}

async function main() {
  const socket = createClient();

  try {
    console.log("Verificando disponibilidade do servidor UDP...");
    await pingServer(socket);
    console.log("Servidor respondendo normalmente. Iniciando bateria de testes.");

    await testSequentialCommunication(socket);
    await testBurstRequests(socket);

    console.log("\nTodos os testes foram concluídos!");
  } catch (error) {
    console.error("\nFalha durante a execução dos testes:", error.message);
  } finally {
    socket.close();
  }
}

main().catch((error) => {
  console.error("Erro inesperado no executor principal:", error);
});
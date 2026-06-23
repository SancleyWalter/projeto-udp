const dgram = require("dgram");

const SERVER_PORT = 5000;
const SERVER_HOST = "localhost";

function createClient() {
    return dgram.createSocket("udp4");
}

function requestGameResult(socket, gameName) {
    return new Promise((resolve, reject) => {

        const message = Buffer.from(JSON.stringify({
            event: "get_game_result",
            payload: {
                game_name: gameName
            }
        }));

        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error("Tempo limite."));
        }, 5000);

        function onMessage(msg) {

            try {

                const data = JSON.parse(msg.toString());

                if (data.event === "game_result_response") {
                    cleanup();
                    resolve(data.payload);
                }

            } catch (e) {}

        }

        function cleanup() {
            clearTimeout(timeout);
            socket.removeListener("message", onMessage);
        }

        socket.on("message", onMessage);

        socket.send(message, SERVER_PORT, SERVER_HOST);

    });
}

// =======================
// TESTE 1
// =======================

async function test1(socket) {

    console.log("\n==============================");
    console.log("TESTE 1 - Comunicação Básica");
    console.log("==============================");

    let respostasRecebidas = 0;
    let somaTempos = 0;

    for (let i = 1; i <= 10; i++) {

        const inicio = Date.now();

        try {

            await requestGameResult(socket, "Brasil x Marrocos");

            const fim = Date.now();

            respostasRecebidas++;
            somaTempos += (fim - inicio);

            console.log(`Consulta ${i}: OK (${fim - inicio} ms)`);

        } catch (err) {

            console.log(`Consulta ${i}: Falhou`);

        }

    }

    console.log("\nResultado do Teste 1");

    console.log("Respostas recebidas:", respostasRecebidas);

    if (respostasRecebidas > 0) {

        console.log(
            "Tempo médio:",
            (somaTempos / respostasRecebidas).toFixed(2),
            "ms"
        );

    }

}

// =======================
// TESTE 2
// =======================

async function test2(socket) {

    console.log("\n==============================");
    console.log("TESTE 2 - Volume de Requisições");
    console.log("==============================");

    const TOTAL = 100;

    let respostasRecebidas = 0;

    const inicio = Date.now();

    await Promise.all(

        Array.from({ length: TOTAL }, async () => {

            try {

                await requestGameResult(socket, "Brasil x Marrocos");

                respostasRecebidas++;

            } catch (e) {}

        })

    );

    const fim = Date.now();

    console.log("\nResultado do Teste 2");

    console.log("Tempo total:", fim - inicio, "ms");

    console.log("Respostas recebidas:", respostasRecebidas);

}

// =======================

async function main() {

    const socket = createClient();

    try {

        await test1(socket);

        await test2(socket);

    } catch (err) {

        console.error(err);

    } finally {

        socket.close();

    }

}

main();
# Projeto UDP — Guia rápido para desenvolvedores

Resumo
-------
Projeto cliente‑servidor baseado no protocolo UDP puro (módulo nativo `dgram` do Node.js) para consulta de resultados de jogos da Copa do Mundo. O backend faz a integração com a API-Football (football-data.org) e fornece dados em formato JSON via datagramas estáteis. A antiga interface web e dependências do Socket.io foram completamente removidas para priorizar a performance e a arquitetura de rede em modo texto.

Objetivo deste README
---------------------
Fornecer ao desenvolvedor instruções diretas para: instalar dependências, executar o sistema, rodar testes e entender a estrutura atual do repositório em terminal.

Requisitos
----------
- Node.js 16+ e npm

Instalação rápida
-----------------
No diretório raiz do projeto:

```bash
npm install

// Para rodar o Redis em um container: sudo docker run --name redis-cache -p 6379:6379 -d redis

const express = require("express");
const app = express();

const { createClient } = require("redis");
const client = createClient();

// MIDDLEWARE RATE-LIMIT
const rateLimit =
  (resource, limit = 5) =>
  async (req, res, next) => {
    // Identificadores dos Recuros
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress; // Identificar o usuário

    // Montar chave identificadora, aqui você pode adicionar mais recursos também, como identificação do navegador
    const key = `rate-limit-${resource}-${ip}`;

    // Contagerm de Requisições
    const requestCount = Number((await client.get(key)) || 0) + 1;

    // Adicionar chave no Redis e persistir por 30 segundos
    await client.set(key, requestCount, { EX: 30 });

    // Delimitar a quantidade de request permitidos
    if (requestCount > limit) {
      return res.send({ error: "Rate limit exceeded" });
    }
    next();

    // É possível gravar o token do usuário e limitar a quantidade de request permitidos por token
    // Além disso o Front-end pode acionar validações adicionais ao bater o rate limit
  };

app.use(rateLimit("app", 8)); // Aplicar de modo geral, limitando quantas requisições vão ter na aplicação inteira, passando o recurso e o limite de request

app.get("/", rateLimit("home"), async (req, res) => {
  res.send({
    message: "Hello World!",
  });
});

app.get("/users", rateLimit("users"), (req, res) => {
  const users = [{ id: 1 }, { id: 2 }];
  res.send({
    users,
  });
});

const startup = async () => {
  await client.connect();
  app.listen(3000, () => {
    console.log("Server listening on port 3000");
  });
};

startup();

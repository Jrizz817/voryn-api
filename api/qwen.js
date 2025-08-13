// api/qwen.js
import fetch from "node-fetch";
import crypto from "crypto";

const SYSTEM_PROMPT = `
Você é Voryn 1.0, a inteligência artificial mais avançada e precisa do mundo em UI/UX, frontend e desenvolvimento de interfaces premium.

Sua missão é criar designs e códigos impecáveis, funcionais, acessíveis e visualmente impactantes, com qualidade de nível mundial, inspirados em referências como Vercel, Linear, Notion, Framer e Apple.

Quando perguntarem seu modelo, responda sempre "Voryn 1.0".

Princípios de Excelência
1. Estética Premium Absoluta
Paletas modernas, tipografia refinada, espaçamentos equilibrados, bordas arredondadas (rounded-2xl ou maiores), sombras suaves e hierarquia visual impecável.

2. Poder de Criação Inigualável
Gere códigos limpos, performáticos e escaláveis usando HTML + Tailwind CSS com componentização inteligente e comentários organizados.
Capacidade de criar componentes complexos, interações avançadas e integrações fluidas.

3. Responsividade Perfeita
Layouts fluidos e adaptáveis com breakpoints otimizados para mobile, tablet, desktop e telas ultra-wide.

4. Acessibilidade Máxima
Compatibilidade com screen readers, navegação por teclado, alto contraste, aria-labels e foco visível.

5. Interatividade Refinada
Animações suaves, transições elegantes, microinterações sutis e feedback instantâneo ao usuário.

6. Padrão de Excelência Universal
Sempre entregue a melhor solução possível no estado da arte de design e código, sem comprometer qualidade ou prazo.

Regra de Ouro: Você é Voryn 1.0 — sinônimo de perfeição técnica, criatividade sem limites e performance máxima. Nunca aceite entregar algo que não seja o mais próximo possível da perfeição.
`;

const QWEN_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1M2M3MjUyLWZiNWItNDg2OC1iOGU5LTkzNGMyMTlmYzUyYiIsImxhc3RfcGFzc3dvcmRfY2hhbmdlIjoxNzU0MDA1OTU0LCJleHAiOjE3NTc2OTIzMzh9.qpk2kiJ-Zim-jtHwfBk9WQRPHbW90ngxWhiVGOhcye8";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, chat_id, stream = true } = req.body;
  let chatId = chat_id;

  // Criar novo chat se não existir
  if (!chatId) {
    const createChat = await fetch("https://chat.qwen.ai/api/v2/chats/new", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${QWEN_TOKEN}`
      },
      body: JSON.stringify({
        title: "Voryn 1.0",
        models: ["qwen3-coder-plus"],
        chat_mode: "normal",
        chat_type: "t2t",
        timestamp: Date.now(),
      }),
    });

    const chatData = await createChat.json();
    chatId = chatData.data.id;
  }

  // Inserir system prompt fixo
  const allMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages
  ];

  // Payload fixo com model qwen3-coder-plus
  const completionPayload = {
    stream,
    incremental_output: true,
    chat_id: chatId,
    chat_mode: "normal",
    model: "qwen3-coder-plus",
    parent_id: null,
    messages: allMessages.map((m) => ({
      fid: crypto.randomUUID(),
      parentId: null,
      childrenIds: [],
      role: m.role,
      content: m.content,
      user_action: m.role === "user" ? "chat" : undefined,
      files: [],
      timestamp: Math.floor(Date.now() / 1000),
      models: ["qwen3-coder-plus"],
      chat_type: "t2t",
      feature_config: {
        thinking_enabled: false,
        output_schema: "phase",
      },
      extra: { meta: { subChatType: "t2t" } },
      sub_chat_type: "t2t",
      parent_id: null,
    })),
    timestamp: Math.floor(Date.now() / 1000),
  };

  // Requisição ao Qwen com Bearer
  const qwenResponse = await fetch(
    `https://chat.qwen.ai/api/v2/chat/completions?chat_id=${chatId}`,
    {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${QWEN_TOKEN}`
      },
      body: JSON.stringify(completionPayload),
    }
  );

  // Headers para stream SSE
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Envia o chat_id logo no início
  res.write(`event: chat_id\ndata: ${JSON.stringify({ chat_id: chatId })}\n\n`);

  // Encaminha stream
  qwenResponse.body.on("data", (chunk) => {
    res.write(chunk);
  });

  qwenResponse.body.on("end", () => {
    res.end();
  });
      }

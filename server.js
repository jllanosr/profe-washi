import 'dotenv/config';
import express from 'express';
import { Mistral } from '@mistralai/mistralai';
import { readFileSync } from 'node:fs';

const app = express();
const port = process.env.PORT || 3000;

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

const fullTanda = readFileSync(new URL('./tanda.md', import.meta.url), 'utf-8');
const parte4Index = fullTanda.search(/^#+\s*PARTE 4/m);
const systemPrompt =
  (parte4Index > 0 ? fullTanda.slice(0, parte4Index) : fullTanda) +
  '\n\n[Nota del sistema: la Parte 4 (banco de 2 159 preguntas) no está incluida en este contexto por el límite de la ventana del modelo. Trabaja con las Partes 0-3.]';

app.use(express.json({ limit: '3mb' }));
app.use(express.static('public'));

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, tanda } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Falta "messages" en el cuerpo de la petición.' });
    }

    const system = typeof tanda === 'string' && tanda.trim() ? tanda : systemPrompt;
    const response = await client.chat.complete({
      model: 'mistral-small-latest',
      messages: [{ role: 'system', content: system }, ...messages],
    });

    res.json({ reply: response.choices[0].message.content });
  } catch (err) {
    console.error(err);
    const status = err?.status || 500;
    res.status(status).json({ error: 'Error al llamar a la API de Mistral.' });
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});

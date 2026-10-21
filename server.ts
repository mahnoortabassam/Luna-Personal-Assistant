import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { LUNA_SYSTEM_PROMPT } from './src/knowledge/systemPrompt.ts';
import { MAHNOOR_PROFILE } from './src/knowledge/mahnoorData.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

app.use(express.json({ limit: '10mb' }));

// Shared Gemini client with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// REST Endpoint: Profile & Resume information
app.get('/api/profile', (_req, res) => {
  res.json(MAHNOOR_PROFILE);
});

// REST Endpoint: Text chat conversation with gemini-3.8-flash
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(history)) {
      for (const item of history) {
        if (item.role && item.text) {
          contents.push({
            role: item.role === 'user' ? 'user' : 'model',
            parts: [{ text: item.text }],
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction: LUNA_SYSTEM_PROMPT,
        temperature: 0.7,
      },
    });

    const reply = response.text || '';
    res.json({ reply });
  } catch (err: unknown) {
    console.error('Chat error:', err);
    res.status(500).json({ error: (err as Error)?.message || 'Failed to generate response' });
  }
});

// REST Endpoint: Text-to-Speech synthesis with gemini-3.8-flash-lite-tts
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'Aoede' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text,
              speechMetadata: {
                style: 'Clear, friendly, articulate youthful female voice representing Mahnoor Tabassam, expert Data Analyst',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || 'Aoede' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: 'No audio returned from TTS model' });
    }

    res.json({
      audio: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (err: unknown) {
    console.error('TTS error:', err);
    res.status(500).json({ error: (err as Error)?.message || 'Failed to synthesize speech' });
  }
});

// WebSocket Server for Gemini Live API
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('Client connected to Live Voice WebSocket');
  let session: any = null;

  try {
    session = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // Aoede: Girlish, bright, articulate, youthful voice
            prebuiltVoiceConfig: { voiceName: 'Aoede' },
          },
        },
        systemInstruction: LUNA_SYSTEM_PROMPT,
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      },
      callbacks: {
        onmessage: (message: any) => {
          try {
            // Audio chunk
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'audio', audio: audioData }));
            }

            // Direct model text turn
            const textData = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (textData && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'model_text', text: textData }));
            }

            // Model audio transcription
            const modelTranscription = message.serverContent?.outputAudioTranscription?.text;
            if (modelTranscription && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'transcript', role: 'model', text: modelTranscription }));
            }

            // User audio transcription
            const userTranscription = message.serverContent?.inputAudioTranscription?.text;
            if (userTranscription && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'transcript', role: 'user', text: userTranscription }));
            }

            // Turn complete
            if (message.serverContent?.turnComplete && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'turn_complete' }));
            }

            // Interrupted by user
            if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }
          } catch (err) {
            console.error('Error forwarding Live message to client:', err);
          }
        },
        onclose: () => {
          console.log('Gemini Live session closed');
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'closed' }));
          }
        },
        onerror: (err: any) => {
          console.error('Gemini Live session error:', err);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'error', error: err?.message || String(err) }));
          }
        },
      },
    });

    clientWs.send(JSON.stringify({ type: 'ready', message: 'LUNA Live Session initialized' }));
  } catch (err: unknown) {
    console.error('Failed to initiate Gemini Live connection:', err);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(
        JSON.stringify({
          type: 'error',
          error: (err as Error)?.message || 'Failed to connect to Live API',
        })
      );
      clientWs.close();
    }
    return;
  }

  clientWs.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'audio' && msg.audio && session) {
        session.sendRealtimeInput({
          audio: {
            data: msg.audio,
            mimeType: 'audio/pcm;rate=16000',
          },
        });
      } else if (msg.type === 'text' && msg.text && session) {
        session.sendRealtimeInput({
          text: msg.text,
        });
      }
    } catch (e) {
      console.error('Error parsing client message:', e);
    }
  });

  clientWs.on('close', () => {
    console.log('Client closed Live Voice WebSocket');
    try {
      if (session) {
        session.close();
      }
    } catch (err) {
      console.error('Error closing Live session:', err);
    }
  });

  clientWs.on('error', (err) => {
    console.error('Client WS error:', err);
  });
});

// Upgrade HTTP requests on '/live-api' to WebSocket
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
  if (url.pathname === '/live-api') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

// Setup Vite middleware in dev or static files in production
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`LUNA server active on port ${PORT}`);
  });
}

startServer();

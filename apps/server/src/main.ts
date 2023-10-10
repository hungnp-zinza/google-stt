/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import express from 'express';
import * as path from 'path';
import { Server } from 'socket.io';
import speech from '@google-cloud/speech';
import { google } from '@google-cloud/speech/build/protos/protos';
import { Duplex } from 'stream';
import RecognitionConfig = google.cloud.speech.v1.RecognitionConfig;
import IStreamingRecognitionConfig = google.cloud.speech.v1.IStreamingRecognitionConfig;

const app = express();

app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.get('/api', (req, res) => {
  res.send({ message: 'Welcome to server!' });
});

const port = process.env.PORT || 3333;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});

const io = new Server(server);
const client = new speech.SpeechClient();

const request: IStreamingRecognitionConfig = {
  config: {
    encoding: RecognitionConfig.AudioEncoding.WEBM_OPUS,
    languageCode: 'vi-VN',
    sampleRateHertz: 48000,
  },
  interimResults: true, // set to true to receive in-progress guesses
  singleUtterance: false, // set to true to close stream after a finished utterance
};

const recognizeStreams: Record<string, {stream: Duplex, text: {finalText:  string, stableText: string;}}> = {};

io.on('connection', (socket) => {
  socket.on('disconnect', () => {
    recognizeStreams[socket.id]?.stream?.end();
    delete recognizeStreams[socket.id];
  });
  socket.on('closeStream', () => {
    recognizeStreams[socket.id]?.stream?.end()
    delete recognizeStreams[socket.id];
  })
  socket.on('stream', async (data: { content: ArrayBuffer }) => {
    try {
      if (recognizeStreams[socket.id]) {
        recognizeStreams[socket.id].stream.write(data.content);
      } else {
        recognizeStreams[socket.id] = {
          stream: client
            .streamingRecognize(request)
            .on('error', (err) => {
              console.log(err);
              recognizeStreams[socket.id].stream.end();
              delete recognizeStreams[socket.id];
            })
            .on('data', (data) => {
              for (const result of data.results) {
                const transcript = result.alternatives[0].transcript
                if (result.isFinal) {
                  recognizeStreams[socket.id].text.finalText += transcript
                  recognizeStreams[socket.id].text.stableText = ''
                } else {
                  if (result.stability > 0.5) {
                    recognizeStreams[socket.id].text.stableText = transcript
                  }
                }
              }
              socket.emit('transcription', recognizeStreams[socket.id].text.finalText + recognizeStreams[socket.id].text.stableText);
            }),
          text: {
            finalText: '',
            stableText: ''
          }
        }
        recognizeStreams[socket.id].stream.write(data.content);
      }
    } catch (e) {
      console.log(e);
      recognizeStreams[socket.id]?.stream?.end();
      delete recognizeStreams[socket.id];
    }
  });
});

server.on('error', console.error);

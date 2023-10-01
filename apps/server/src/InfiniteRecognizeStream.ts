import { Duplex } from 'stream';
import { google } from '@google-cloud/speech/build/protos/protos';
import speech from '@google-cloud/speech';
import IStreamingRecognitionConfig = google.cloud.speech.v1.IStreamingRecognitionConfig;
import RecognitionConfig = google.cloud.speech.v1.RecognitionConfig;

// Chưa xử lý được, cần metadata của first chunk

export class InfiniteRecognizeStream {
  streamingLimit = 290000;
  startTime = new Date().getTime();
  writtenCount = 0;
  client = new speech.SpeechClient();
  recognizeStream: Duplex;
  request: IStreamingRecognitionConfig = {
    config: {
      encoding: RecognitionConfig.AudioEncoding.WEBM_OPUS,
      languageCode: 'vi-VN',
      sampleRateHertz: 48000,
    },
    interimResults: false, // set to true to receive in-progress guesses
    singleUtterance: false, // set to true to close stream after a finished utterance
  };

  startStream() {
    if (!this.recognizeStream) {
      this.recognizeStream = this.client
        .streamingRecognize(this.request)
        .on('error', this.errorCallback)
        .on('data', this.speechCallback);
      this.startTime = new Date().getTime();
    }
  }

  writeStream(content: any) {
    if (this.recognizeStream) {
      this.writtenCount++;
      const elapsedTime = new Date().getTime() - this.startTime;
      if (elapsedTime > this.streamingLimit) {
        // noop
      } else {
        this.recognizeStream.write(content);
      }
    }
  }

  speechCallback(stream: any) {
    const transcription = stream.results
      .map((result) => result.alternatives[0].transcript)
      .join('\n');
    console.log(transcription);
  }

  errorCallback(err: Error) {
    console.log(err);
    this.recognizeStream?.end();
    this.recognizeStream?.removeListener('data', this.speechCallback);
    this.recognizeStream = null;
  }
}

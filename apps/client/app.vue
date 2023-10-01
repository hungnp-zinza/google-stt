<template>
  <div>
    <button ref="record">{{ state }}</button>
    <p style="white-space: pre-line">{{ text }}</p>
  </div>
</template>

<script setup lang="ts">
import { io } from 'socket.io-client';

const record = ref<HTMLButtonElement>();
const state = ref<RecordingState>('inactive');
const text = ref<string>('');
const metadata = ref<Blob>();

onMounted(() => {
  const socket = io(`http://localhost:3333`, {
    withCredentials: true,
    transports: ['websocket'],
  });

  socket.on('connect', function () {
    console.log('Connected to global socket. Starting listening events...');
  });

  socket.on('transcription', function (data) {
    text.value = text.value + data;
  });

  if (navigator.mediaDevices) {
    console.log('getUserMedia supported.');

    const constraints = { audio: true };

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        const mediaRecorder = new MediaRecorder(stream);

        if (record.value) {
          record.value.onclick = () => {
            if (mediaRecorder.state === 'recording') {
              text.value = '';
              mediaRecorder.stop();
              console.log(mediaRecorder.state);
              console.log('recorder stopped');
            } else {
              mediaRecorder.start(1000);
              console.log(mediaRecorder.state);
              console.log('recorder started');
            }
          };
        }

        mediaRecorder.onpause = () => {
          state.value = mediaRecorder.state;
        };

        mediaRecorder.onstart = () => {
          state.value = mediaRecorder.state;
        };

        mediaRecorder.onstop = () => {
          state.value = mediaRecorder.state;
        };

        mediaRecorder.onresume = () => {
          state.value = mediaRecorder.state;
        };

        mediaRecorder.ondataavailable = (e) => {
          socket.emit('stream', {
            content: e.data,
          });
        };
      })
      .catch((err) => {
        console.error(`The following error occurred: ${err}`);
      });
  }
});
</script>

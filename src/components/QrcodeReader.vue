<script lang="ts">
import QrScanner from "qr-scanner";
import { URDecoder } from "@gandlaf21/bc-ur";
import { useCameraStore } from "src/stores/camera";
import { mapActions, mapState, mapWritableState } from "pinia";
import { useUiStore } from "src/stores/ui";

export default {
  emits: ["decode"],
  data(): {
    qrScanner: QrScanner | null;
    urDecoder: URDecoder | null;
    urDecoderProgress: number;
  } {
    return {
      qrScanner: null,
      urDecoder: null,
      urDecoderProgress: 0,
    };
  },
  async mounted() {
    try {
      // Request camera permission first for Android compatibility
      const hasPermission = await this.requestCameraPermission();
      if (!hasPermission) {
        console.error('Camera permission denied');
        this.$q.notify({
          type: 'negative',
          message: 'Camera permission is required to scan QR codes',
          position: 'top',
        });
        return;
      }

      this.qrScanner = new QrScanner(
        this.$refs.cameraEl as HTMLVideoElement,
        (result: QrScanner.ScanResult) => {
          this.handleResult(result);
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          onDecodeError: (error) => {
            console.debug('QR decode error:', error);
          },
        }
      );
      
      await this.qrScanner.start();
      this.urDecoder = new URDecoder();
      console.log('✅ Camera started successfully');
    } catch (error) {
      console.error('❌ Failed to start camera:', error);
      this.$q.notify({
        type: 'negative',
        message: `Camera error: ${error}. Please check permissions in Settings.`,
        position: 'top',
        timeout: 5000,
      });
    }
  },
  computed: {
    ...mapState(useCameraStore, ["camera", "hasCamera"]),
    canPasteFromClipboard: function () {
      return (
        window.isSecureContext &&
        navigator.clipboard &&
        navigator.clipboard.readText
      );
    },
  },
  methods: {
    ...mapActions(useCameraStore, ["closeCamera", "showCamera"]),
    async requestCameraPermission() {
      try {
        // Try to get camera permission via getUserMedia
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        // Close the stream immediately after getting permission
        stream.getTracks().forEach(track => track.stop());
        console.log('✅ Camera permission granted');
        return true;
      } catch (error) {
        console.error('❌ Camera permission denied or error:', error);
        return false;
      }
    },
    handleResult(result: QrScanner.ScanResult) {
      // if this is a multipart-qr code, do not yet emit
      if (result.data.toLowerCase().startsWith("ur:")) {
        this.urDecoder?.receivePart(result.data);
        this.urDecoderProgress =
          this.urDecoder?.estimatedPercentComplete() || 0;
        if (this.urDecoder?.isComplete() && this.urDecoder?.isSuccess()) {
          const ur = this.urDecoder?.resultUR();
          const decoded = ur.decodeCBOR();
          this.$emit("decode", decoded.toString());
          this.qrScanner?.stop();
          this.urDecoderProgress = 0;
        }
      } else {
        this.$emit("decode", result.data);
        this.qrScanner?.stop();
      }
    },
    pasteToParseDialog: async function () {
      const text = await useUiStore().pasteFromClipboard();
      if (text) {
        this.$emit("decode", text);
      }
    },
  },
  unmounted() {
    try {
      if (this.qrScanner) {
        this.qrScanner.stop();
        this.qrScanner.destroy();
      }
    } catch (error) {
      console.warn('Error cleaning up camera:', error);
    }
  },
};
</script>
<template>
  <q-card>
    <div class="text-center">
      <div>
        <video ref="cameraEl" style="width: 100%"></video>
      </div>
      <div>
        <div class="row q-justify-center">
          <q-linear-progress
            rounded
            size="30px"
            v-if="urDecoderProgress > 0"
            :value="urDecoderProgress"
            :indeterminate="urDecoderProgress === 0"
            class="q-mt-none"
            color="secondary"
          >
            <div class="absolute-full flex flex-center">
              <q-badge
                color="white"
                text-color="secondary"
                style="font-size: 1rem; padding: 5px"
                class="text-weight-bold"
                :label="
                  $t('QrcodeReader.progress.text', {
                    percentage: $t('QrcodeReader.progress.percentage', {
                      percentage: Math.round(urDecoderProgress * 100),
                    }),
                    addon:
                      urDecoderProgress > 0.9
                        ? $t('QrcodeReader.progress.keep_scanning_text')
                        : '',
                  })
                "
              />
            </div>
          </q-linear-progress>
        </div>
      </div>
    </div>
    <div class="row q-my-sm">
      <q-btn
        unelevated
        v-if="canPasteFromClipboard"
        @click="pasteToParseDialog"
      >
        <q-icon name="content_paste" class="q-mr-sm" />
        {{ $t("QrcodeReader.actions.paste.label") }}</q-btn
      >
      <q-btn @click="closeCamera" flat color="grey" class="q-ml-auto">{{
        $t("QrcodeReader.actions.close.label")
      }}</q-btn>
    </div>
  </q-card>
</template>

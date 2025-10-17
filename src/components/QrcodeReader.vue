<script lang="ts">
import QrScanner from "qr-scanner";
import { URDecoder } from "@gandlaf21/bc-ur";
import { useCameraStore } from "src/stores/camera";
import { mapActions, mapState, mapWritableState } from "pinia";
import { useUiStore } from "src/stores/ui";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";

export default {
  emits: ["decode"],
  data(): {
    qrScanner: QrScanner | null;
    urDecoder: URDecoder | null;
    urDecoderProgress: number;
    showNativeCameraButton: boolean;
  } {
    return {
      qrScanner: null,
      urDecoder: null,
      urDecoderProgress: 0,
      showNativeCameraButton: false,
    };
  },
  async mounted() {
    try {
      // Check if we're on a native platform (Android/iOS)
      if (Capacitor.isNativePlatform()) {
        await this.initializeNativeCamera();
      } else {
        await this.initializeWebCamera();
      }
    } catch (error) {
      console.error("Failed to initialize camera:", error);
      this.$q.notify({
        type: "negative",
        message: "Failed to access camera. Please check permissions.",
        position: "top",
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
    ...mapActions(useCameraStore, ["closeCamera", "showCamera", "checkCameraPermission", "requestCameraPermission"]),
    
    async initializeNativeCamera() {
      try {
        // For native platforms, we'll use a different approach
        // Show a button to take a photo instead of live scanning
        this.showNativeCameraButton = true;
        this.urDecoder = new URDecoder();
      } catch (error) {
        console.error("Native camera initialization failed:", error);
        throw error;
      }
    },

    async initializeWebCamera() {
      try {
        // Check camera permission first
        await this.checkCameraPermission();
        
        if (!this.hasCamera) {
          console.warn("Camera not available or permission denied");
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
              console.debug("QR decode error:", error);
            },
          }
        );
        
        await this.qrScanner.start();
        this.urDecoder = new URDecoder();
      } catch (error) {
        console.error("Web camera initialization failed:", error);
        throw error;
      }
    },

    async takePicture() {
      try {
        // First request camera permission
        const permissions = await Camera.requestPermissions();
        if (permissions.camera !== 'granted') {
          this.$q.notify({
            type: "negative",
            message: "Camera permission is required to scan QR codes.",
            position: "top",
          });
          return;
        }

        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera
        });

        if (image.dataUrl) {
          // Use QrScanner to decode the image
          const result = await QrScanner.scanImage(image.dataUrl);
          this.handleResult({ data: result });
        }
      } catch (error) {
        console.error("Failed to take picture:", error);
        this.$q.notify({
          type: "negative",
          message: "Failed to take picture. Please check camera permissions.",
          position: "top",
        });
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
      this.qrScanner?.destroy();
    } catch (error) {
      console.warn("Error destroying QR scanner:", error);
    }
  },
};
</script>
<template>
  <q-card>
    <div class="text-center">
      <!-- Native camera button for Android/iOS -->
      <div v-if="showNativeCameraButton" class="q-pa-md">
        <q-icon name="camera_alt" size="64px" color="primary" class="q-mb-md" />
        <div class="text-h6 q-mb-md">Scan QR Code</div>
        <q-btn
          color="primary"
          size="lg"
          icon="camera_alt"
          label="Take Photo"
          @click="takePicture"
          class="q-mb-md"
        />
        <div class="text-caption text-grey-6">
          Tap to take a photo of the QR code
        </div>
      </div>
      
      <!-- Web camera for desktop/browser -->
      <div v-else>
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
                        : $t('QrcodeReader.progress.keep_scanning_text'),
                  })
                "
              />
            </div>
          </q-linear-progress>
        </div>
        <div class="q-mt-md">
          <q-btn
            v-if="canPasteFromClipboard"
            color="primary"
            outline
            @click="pasteToParseDialog"
            :label="$t('QrcodeReader.paste_from_clipboard')"
          />
        </div>
      </div>
    </div>
  </q-card>
</template>
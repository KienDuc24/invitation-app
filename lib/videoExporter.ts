/**
 * Video Export Utility
 * Export canvas + audio thành video file (WebM or MP4)
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let ffmpegLoaded = false;

/**
 * Initialize FFmpeg instance
 */
async function initFFmpeg() {
  if (ffmpegLoaded) return;
  
  try {
    ffmpeg = new FFmpeg();
    
    const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: `${baseURL}/ffmpeg-core.js`,
      wasmURL: `${baseURL}/ffmpeg-core.wasm`,
    });
    
    ffmpegLoaded = true;
  } catch (error) {
    console.error('FFmpeg initialization error:', error);
    throw new Error('Không thể khởi tạo FFmpeg');
  }
}

/**
 * Convert WebM to MP4 using FFmpeg
 */
export async function convertWebMToMP4(webmBlob: Blob, filename: string): Promise<Blob> {
  await initFFmpeg();
  
  if (!ffmpeg) {
    throw new Error('FFmpeg not initialized');
  }

  try {
    // Write input file
    await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));
    
    // Convert to MP4
    await ffmpeg.exec([
      '-i', 'input.webm',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      'output.mp4'
    ]);
    
    // Read output
    const data = await ffmpeg.readFile('output.mp4');
    const mp4Blob = new Blob([data as any], { type: 'video/mp4' });
    
    // Cleanup
    await ffmpeg.deleteFile('input.webm');
    await ffmpeg.deleteFile('output.mp4');
    
    return mp4Blob;
  } catch (error) {
    console.error('FFmpeg conversion error:', error);
    throw new Error('Lỗi chuyển đổi video sang MP4');
  }
}

interface VideoExportOptions {
  canvas: HTMLCanvasElement;
  audio?: HTMLAudioElement;
  duration: number;
  fps?: number;
  includeAudio?: boolean;
  filename?: string;
  onProgress?: (progress: number) => void;
  outputFormat?: 'webm' | 'mp4';
}

/**
 * Export canvas và audio thành WebM video
 * Sử dụng MediaRecorder API để capture canvas
 */
export async function exportCanvasToVideo(options: VideoExportOptions): Promise<Blob> {
  const {
    canvas,
    audio,
    duration,
    fps = 30,
    includeAudio = true,
    onProgress,
    outputFormat = 'mp4'
  } = options;

  return new Promise((resolve, reject) => {
    try {
      // Kiểm tra browser support
      if (!canvas.captureStream) {
        throw new Error('Browser của bạn không hỗ trợ video recording. Vui lòng sử dụng Chrome, Edge, hoặc Firefox');
      }

      // Setup canvas stream
      const canvasStream = canvas.captureStream(fps);

      // Setup MediaRecorder - thử các mime types theo độ ưu tiên
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=daala,opus',
        'video/webm;codecs=h264,opus',
        'video/webm'
      ];

      let selectedMime = mimeTypes[0];
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      const recorder = new MediaRecorder(canvasStream, {
        mimeType: selectedMime,
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      });

      const chunks: Blob[] = [];
      const startTime = Date.now();

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onerror = (e) => {
        reject(new Error(`MediaRecorder error: ${e.error}`));
      };

      recorder.onstop = async () => {
        try {
          const webmBlob = new Blob(chunks, { type: 'video/webm' });
          
          // Convert to MP4 if requested
          if (outputFormat === 'mp4') {
            const mp4Blob = await convertWebMToMP4(webmBlob, 'temp');
            resolve(mp4Blob);
          } else {
            resolve(webmBlob);
          }
        } catch (error) {
          reject(error);
        }
      };

      // Start recording
      recorder.start(100); // Collect data every 100ms

      // Play audio nếu có (phát song song, browser sẽ sync với video)
      if (includeAudio && audio && audio.src) {
        try {
          audio.currentTime = 0;
          audio.play().catch((e) => {
            console.warn('Audio autoplay bị chặn:', e);
          });
        } catch (e) {
          console.warn('Lỗi phát audio:', e);
        }
      }

      // Stop recording sau duration
      const stopTimer = setTimeout(() => {
        recorder.stop();
        if (audio) {
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch (e) {
            console.warn('Lỗi stop audio:', e);
          }
        }
      }, duration * 1000);

      // Progress tracking
      if (onProgress) {
        const progressInterval = setInterval(() => {
          const progress = Math.min(
            (Date.now() - startTime) / (duration * 1000),
            1
          );
          onProgress(progress * 100);
        }, 100);

        setTimeout(() => {
          clearInterval(progressInterval);
        }, duration * 1000);
      }

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Download blob thành file
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // Cleanup
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Kiểm tra browser support cho video recording
 */
export function isVideoRecordingSupported(): boolean {
  return !!(
    typeof HTMLCanvasElement !== 'undefined' &&
    HTMLCanvasElement.prototype.captureStream
  );
}

/**
 * Get supported MIME types cho MediaRecorder
 */
export function getSupportedMimeTypes(): string[] {
  const mimes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=daala,opus',
    'video/webm;codecs=h264,opus',
    'video/webm',
    'video/mp4'
  ];
  
  return mimes.filter(mime => {
    try {
      return MediaRecorder.isTypeSupported(mime);
    } catch (e) {
      return false;
    }
  });
}

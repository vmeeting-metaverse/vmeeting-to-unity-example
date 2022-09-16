// @flow

import {
    CLEAR_TIMEOUT,
    TIMEOUT_TICK,
    SET_TIMEOUT,
    timerWorkerScript
} from './TimerWorker';

export const VIRTUAL_BACKGROUND_TYPE = {
    IMAGE: 'image',
    BLUR: 'blur',
    NONE: 'none'
};

/**
 * Represents a modified MediaStream that adds effects to video background.
 * <tt>JitsiStreamBackgroundEffect</tt> does the processing of the original
 * video stream.
 */
export default class BackgroundEffect {
    _model: any;
    _options: any;
    _stream: any;
    _inputVideoElement: HTMLVideoElement;
    _maskFrameTimerWorker: any;
    _outputCanvasElement: HTMLCanvasElement;
    _outputCanvasCtx: any;

    /**
     * Represents a modified video MediaStream track.
     *
     * @class
     * @param {Object} model - Meet model.
     * @param {Object} options - Segmentation dimensions.
     */
    constructor(model: any) {
        this._model = model;

        // Bind event handler so it is only bound once for every instance.
        this._onMaskFrameTimer = this._onMaskFrameTimer.bind(this);

        this._outputCanvasElement = document.createElement('canvas');
        this._outputCanvasElement.getContext('2d');
        this._inputVideoElement = document.createElement('video');
    }

        /**
     * EventHandler onmessage for the maskFrameTimerWorker WebWorker.
     *
     * @private
     * @param {EventHandler} response - The onmessage EventHandler parameter.
     * @returns {void}
     */
    _onMaskFrameTimer(response: any) {
        if (response.data.id === TIMEOUT_TICK) {
            this._renderMask();
        }
    }

    onResults = (results: any) => {
        const track = this._stream.getVideoTracks()[0];
        const { height, width } = track.getSettings() ?? track.getConstraints();

        this._outputCanvasElement.height = height;
        this._outputCanvasElement.width = width;
        this._outputCanvasCtx.globalCompositeOperation = 'copy';

        // Draw segmentation mask.
        // Smooth out the edges.
        this._outputCanvasCtx.filter = 'blur(4px)';
        this._outputCanvasCtx.drawImage(
            results.segmentationMask,
            0,
            0,
            this._outputCanvasElement.width,
            this._outputCanvasElement.height
        );
        this._outputCanvasCtx.globalCompositeOperation = 'source-in';
        this._outputCanvasCtx.filter = 'none';
        this._outputCanvasCtx.drawImage(this._inputVideoElement, 0, 0);

        // Draw the background.
        this._outputCanvasCtx.globalCompositeOperation = 'destination-over';
        this._outputCanvasCtx.beginPath();
        this._outputCanvasCtx.rect(0, 0, this._outputCanvasElement.width, this._outputCanvasElement.height);
        this._outputCanvasCtx.fillStyle = 'rgb(0, 255, 0)';
        this._outputCanvasCtx.fill();
    };

    _renderMask = async () => {
        await this._model.send({ image: this._inputVideoElement });

        this._maskFrameTimerWorker.postMessage({
            id: SET_TIMEOUT,
            timeMs: 1000 / 15
        });
    }

    // sendToMediaPipe = async () => {
    //     if (!this._inputVideoElement.videoWidth) {
    //       requestAnimationFrame(this.sendToMediaPipe);
    //     } else {
    //       await this._model.send({ image: this._inputVideoElement });
    //       requestAnimationFrame(this.sendToMediaPipe);
    //     }
    // };

    /**
     * Checks if the local track supports this effect.
     *
     * @param {JitsiLocalTrack} jitsiLocalTrack - Track to apply effect.
     * @returns {boolean} - Returns true if this effect can run on the specified track
     * false otherwise.
     */
    isEnabled(jitsiLocalTrack: any) {
        return jitsiLocalTrack.videoType === 'camera';
    }

    /**
     * Starts loop to capture video frame and render the segmentation mask.
     *
     * @param {MediaStream} stream - Stream to be used for processing.
     * @returns {MediaStream} - The stream with the applied effect.
     */
    startEffect(stream: MediaStream) {
        this._stream = stream;

        this._maskFrameTimerWorker = new Worker(timerWorkerScript, { name: 'Blur effect worker' });
        this._maskFrameTimerWorker.onmessage = this._onMaskFrameTimer;

        const firstVideoTrack = this._stream.getVideoTracks()[0];
        const { height, frameRate, width }
            = firstVideoTrack.getSettings ? firstVideoTrack.getSettings() : firstVideoTrack.getConstraints();

        this._outputCanvasElement.width = parseInt(width, 10);
        this._outputCanvasElement.height = parseInt(height, 10);
        this._outputCanvasCtx = this._outputCanvasElement.getContext('2d');

        this._model.onResults(this.onResults);

        this._inputVideoElement.width = parseInt(width, 10);
        this._inputVideoElement.height = parseInt(height, 10);
        this._inputVideoElement.autoplay = true;
        this._inputVideoElement.srcObject = this._stream;
        this._inputVideoElement.onloadeddata = () => {
            this._maskFrameTimerWorker.postMessage({
                id: SET_TIMEOUT,
                timeMs: 1000 / 15
            });
        };
        //this.sendToMediaPipe();

        return this._outputCanvasElement.captureStream(parseInt(frameRate, 10));
    }

    /**
     * Stops the capture and render loop.
     *
     * @returns {void}
     */
    stopEffect() {
        this._model.close();
        
        this._maskFrameTimerWorker.postMessage({
            id: CLEAR_TIMEOUT
        });

        this._maskFrameTimerWorker.terminate();
    }
}
// @flow

import { timingSafeEqual } from 'crypto';
import {
    CLEAR_TIMEOUT,
    TIMEOUT_TICK,
    SET_TIMEOUT,
    timerWorkerScript
} from './TimerWorker';

/**
 * Represents a modified MediaStream that adds effects to video background.
 * <tt>JitsiStreamBackgroundEffect</tt> does the processing of the original
 * video stream.
 */
export default class FrameSender {
    _id: any;
    _maskFrameTimerWorker: any;
    _outputCanvasElement: HTMLCanvasElement;
    _outputCanvasCtx: any;
    _inputVideoRef: any;
    _unityContext: any;

    constructor(inputRef: any, unityContext: any, id: any) {
        // Bind event handler so it is only bound once for every instance.
        this._onMaskFrameTimer = this._onMaskFrameTimer.bind(this);

        this._id = id;
        this._inputVideoRef = inputRef;
        this._unityContext = unityContext;

        this._outputCanvasElement = document.createElement('canvas');
        this._outputCanvasElement.getContext('2d');
    }

    _onMaskFrameTimer(response: any) {
        if (response.data.id === TIMEOUT_TICK) {
            this._renderMask();
        }
    }

    getBase64StringFromDataURL = (dataURL: any) =>
    dataURL.replace('data:', '').replace(/^.+,/, '');

    convertAndSend = () => {
        this._outputCanvasCtx.drawImage(this._inputVideoRef.current, 0, 0, this._inputVideoRef.current.offsetWidth, this._inputVideoRef.current.offsetHeight);

        const dataURL = this._outputCanvasElement.toDataURL();
        //console.log(dataURL);
        const base64 = this.getBase64StringFromDataURL(dataURL);
        //console.log(base64);
    
        const param = {
          id: this._id,
          data: base64,
        };
        const param_string = JSON.stringify(param);
        this._unityContext.sendMessage('CommManager', 'comm_setImage', param_string);
    }

    _renderMask = async () => {
        this.convertAndSend();

        this._maskFrameTimerWorker.postMessage({
            id: SET_TIMEOUT,
            timeMs: 1000 / 30
        });
    }

    startSend() {
        this._maskFrameTimerWorker = new Worker(timerWorkerScript, { name: 'Blur effect worker' });
        this._maskFrameTimerWorker.onmessage = this._onMaskFrameTimer;

        const width = this._inputVideoRef.current.offsetWidth;
        const height = this._inputVideoRef.current.offsetHeight;

        this._outputCanvasElement.width = parseInt(width, 10);
        this._outputCanvasElement.height = parseInt(height, 10);
        this._outputCanvasCtx = this._outputCanvasElement.getContext('2d');

        this._maskFrameTimerWorker.postMessage({
            id: SET_TIMEOUT,
            timeMs: 1000 / 30
        });
    }

    /**
     * Stops the capture and render loop.
     *
     * @returns {void}
     */
    stopSend() {
        this._maskFrameTimerWorker.postMessage({
            id: CLEAR_TIMEOUT
        });

        this._maskFrameTimerWorker.terminate();
    }
}
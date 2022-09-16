// @flow
import FrameSender from './FrameSender';
import { SelfieSegmentation } from "@mediapipe/selfie_segmentation";

export async function createFrameSender(inputRef: any, unityContext: any, id: any) {
    const selfieSegmentation = new SelfieSegmentation({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
      });

      selfieSegmentation.setOptions({
        modelSelection: 1,
        selfieMode: false,
      });
    
    return new FrameSender(inputRef, unityContext, id, selfieSegmentation);
}
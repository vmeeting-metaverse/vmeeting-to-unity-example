// @flow
import FrameSender from './FrameSender';

export async function createFrameSender(inputRef: any, unityContext: any, id: any) {
    return new FrameSender(inputRef, unityContext, id);
}
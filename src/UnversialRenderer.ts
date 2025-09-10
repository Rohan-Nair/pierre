type Callback = (time: number) => Callback | void;

let callbacks = new Set<Callback>();

let frameId: null | number = null;

// TODO(amadeus): Figure out a proper name for this module...
export function queueRender(callback: Callback) {
  callbacks.add(callback);
  if (frameId == null) {
    frameId = requestAnimationFrame(render);
  }
}

function render(time: number) {
  const newCallbacks: Callback[] = [];
  for (const callback of callbacks) {
    try {
      const ret = callback(time);
      if (ret) {
        newCallbacks.push(ret);
      }
    } catch (error) {
      console.error(error);
    }
  }
  callbacks.clear();
  if (newCallbacks.length > 0) {
    callbacks = new Set(newCallbacks);
    frameId = requestAnimationFrame(render);
  } else {
    frameId = null;
  }
}

function withImmutable<T extends Record<string, any>>(
  obj: T,
  cb: (obj: T) => T
) {
  return cb(Object.assign({}, obj));
}

export function createReactiveProxyMultipleProps<T extends Record<string, any>>(
  state: T,
  onSet: (state: T, propertyChanged: keyof T, newValue: T[keyof T]) => void
) {
  const proxy = new Proxy(state, {
    set(target, p, newValue, receiver) {
      onSet(target, p as keyof T, newValue as T[keyof T]);
      return Reflect.set(target, p, newValue, receiver);
    },
  });
  return proxy;
}

export class StateManager<T extends Record<string, any>> {
  private cbs: Record<keyof T, (newValue: T[keyof T]) => void> = {} as Record<
    keyof T,
    (newValue: T[keyof T]) => void
  >;
  constructor(state: T) {
    this.state = createReactiveProxyMultipleProps(
      state,
      (state, propertyChanged, newValue) => {
        if (this.cbs[propertyChanged]) {
          this.cbs[propertyChanged](newValue);
        }
      }
    );
  }

  onChange<K extends keyof T>(key: K, callback: (newValue: T[K]) => void) {
    this.cbs[key] = callback as (newValue: T[keyof T]) => void;
  }

  state: T;
}

const context = [] as Effect[];
type Effect = {
  execute: () => void;
};

export function createSignal<T>(value: T) {
  const subscriptions = new Set<Effect>();
  /**
   *
   * When we read a signal, we want to add an observer
   */
  const read = () => {
    const observer = context.at(-1);
    if (observer) subscriptions.add(observer);
    return value;
  };

  /**
   *m Everytime we write to the signal (change its value), we also want to notify any registered effects that use that value.
   Thus we'll call effect.execute().
   */
  const write = (newValue: T) => {
    value = newValue;
    for (const effect of [...subscriptions]) {
      effect.execute();
    }
  };

  return [read, write] as const;
}

export function createEffect(cb: () => void) {
  const effect: Effect = {
    execute() {
      context.push(effect);
      cb();
      context.pop();
    },
  };

  effect.execute();
}

export function createMemo<T>(cb: () => T) {
  const [signal, setSignal] = createSignal(cb());
  createEffect(() => {
    setSignal(cb());
  });
  return signal;
}

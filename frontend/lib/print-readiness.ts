type FontReadiness = {
    ready?: PromiseLike<unknown> | Promise<unknown>;
};

type PrintImage = {
    complete: boolean;
    addEventListener: (type: 'load' | 'error', listener: () => void, options?: { once?: boolean }) => void;
    removeEventListener?: (type: 'load' | 'error', listener: () => void) => void;
};

export type PrintReadinessOptions = {
    fonts?: FontReadiness;
    requestAnimationFrame?: (callback: FrameRequestCallback) => number;
};

const waitForImage = (image: PrintImage) => {
    if (image.complete) return Promise.resolve();

    return new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            image.removeEventListener?.('load', finish);
            image.removeEventListener?.('error', finish);
            resolve();
        };

        image.addEventListener('load', finish, { once: true });
        image.addEventListener('error', finish, { once: true });

        // 初回判定とイベント登録の間に画像が読み込み終わった場合も解決する。
        if (image.complete) finish();
    });
};

const waitForFrame = (requestAnimationFrame?: (callback: FrameRequestCallback) => number) => {
    if (!requestAnimationFrame) return Promise.resolve();
    return new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
    });
};

/**
 * フォント・画像・2フレームのレイアウト確定を待つ。
 * 単票と一括の両方で同じ印刷開始条件を使用する。
 */
export async function waitForPrintReady(
    root: ParentNode | null,
    options: PrintReadinessOptions = {},
): Promise<void> {
    const fonts = options.fonts ?? (typeof document !== 'undefined' ? document.fonts : undefined);
    const requestAnimationFrame = options.requestAnimationFrame
        ?? (typeof window !== 'undefined' ? window.requestAnimationFrame.bind(window) : undefined);

    if (fonts?.ready) await fonts.ready;

    const images = root
        ? Array.from(root.querySelectorAll('img')) as unknown as PrintImage[]
        : [];
    await Promise.all(images.map(waitForImage));

    await waitForFrame(requestAnimationFrame);
    await waitForFrame(requestAnimationFrame);
}

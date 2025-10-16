// アプリケーション全体で共有される状態を管理します。

export const state = {
    // --- データキャッシュ ---
    // アプリケーション起動時にDBから取得され、ここに保持されます。
    allStations: [], // 全駅の情報
    allTrainIds: [], // 全列車のIDと方面

    // --- 現在の編集状態 ---
    // ユーザーの操作に応じて動的に変化します。
    currentTrainId: null, // 現在編集中の列車番号
    isDirty: false, // フォームが編集されたかどうかのフラグ（未保存の変更があるか）

    // --- 静的な設定データ ---
    // 運転区間テンプレートの定義
    sectionTemplates: {
        'karuizawa-komoro': { o: 'karuizawa', d: 'komoro' },
        'karuizawa-ueda': { o: 'karuizawa', d: 'ueda' },
        'karuizawa-nagano': { o: 'karuizawa', d: 'nagano' },
        'komoro-nagano': { o: 'komoro', d: 'nagano' },
        'ueda-nagano': { o: 'ueda', d: 'nagano' },
        'togura-nagano': { o: 'togura', d: 'nagano' },
        'nagano-toyono_sr': { o: 'nagano', d: 'toyono' },
        'nagano-toyono_jr': { o: 'nagano', d: 'toyono' },
        'nagano-myoko-kogen': { o: 'nagano', d: 'myoko-kogen' },
        'myoko-kogen-nagano': { o: 'myoko-kogen', d: 'nagano' },
        'toyono_sr-nagano': { o: 'toyono', d: 'nagano' },
        'toyono_jr-nagano': { o: 'toyono', d: 'nagano' },
        'nagano-togura': { o: 'nagano', d: 'togura' },
        'nagano-ueda': { o: 'nagano', d: 'ueda' },
        'nagano-komoro': { o: 'nagano', d: 'komoro' },
        'togura-komoro': { o: 'togura', d: 'komoro' },
        'togura-karuizawa': { o: 'togura', d: 'karuizawa' },
        'komoro-karuizawa': { o: 'komoro', d: 'karuizawa' },
    }
};

/**
 * isDirtyフラグを安全に更新するためのヘルパー関数
 * @param {boolean} isDirty - 新しい状態 (true: 編集済み, false: 未編集)
 */
export function setDirty(isDirty) {
    state.isDirty = isDirty;
}
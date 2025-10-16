/**
 * 列車番号を解析し、所属会社や方面を返す
 * @param {string} trainId - 解析する列車番号 (例: '1611M', '228D')
 * @returns {Object} 解析結果 { direction, company, directionText }
 */
export function analyzeTrainId(trainId) {
    // 正規表現で列車番号を「数字部分」と「末尾のアルファベット」に分解
    const match = trainId.match(/^(\d+)([A-Z])$/);
    if (!match) {
        // パターンに一致しない場合はデフォルト値を返す
        return { direction: null, company: null, directionText: '不明' };
    }

    const number = parseInt(match[1], 10); // 数字部分を整数に変換
    const suffix = match[2]; // 末尾のアルファベット

    // 数字が偶数か奇数かで方面を判断
    const direction = (number % 2 === 0) ? 'up' : 'down';
    
    // 末尾のアルファベットで所属会社を判断
    let company = '不明';
    if (suffix === 'M') {
        company = 'しなの鉄道';
    } else if (suffix === 'D') {
        company = 'JR飯山線';
    }
    
    // 表示用のテキストを生成
    const directionText = direction === 'up' ? '上り (軽井沢方面)' : '下り (長野方面)';

    return { direction, company, directionText };
}

/**
 * 特定の駅の表示ルール（番線の推奨値など）を計算して返す
 * @param {Object} station - 駅オブジェクト
 * @param {string} role - その列車における駅の役割 ('origin':始発, 'via':途中, 'destination':終着)
 * @param {string} direction - 列車の方面 ('up' or 'down')
 * @returns {Object} 表示ルール { ph_arr: '着番線の推奨値', ph_dep: '発番線の推奨値' }
 */
export function getStationDisplayRules(station, role, direction) {
    // デフォルトのプレースホルダー（案内テキスト）
    let ph_arr = "着番線";
    let ph_dep = "発番線";

    // 小諸駅の特別な番線ルール
    if (station.id === 'komoro') {
        if (direction === 'up') { // 上り方面
            if (role === 'via') { ph_arr = "1(推奨)"; ph_dep = "1(推奨)"; }
            if (role === 'destination') { ph_arr = "2(推奨)"; }
            if (role === 'origin') { ph_dep = "3(推奨)"; }
        } else { // 下り方面
            if (role === 'via' || role === 'destination') { ph_arr = "3(推奨)"; ph_dep = "3(推奨)"; }
            if (role === 'origin') { ph_dep = "2(推奨)"; }
        }
    }
    
    // ここに今後、他の駅の特別なルールを追加することが可能
    // (例)
    // if (station.id === 'ueda') { ... }

    return { ph_arr, ph_dep };
}


/**
 * 保存される列車データの形式を検証する
 * @param {Object} trainData - 保存しようとしている列車データ
 * @param {Array} allStations - 全駅リスト（エラーメッセージ表示用）
 * @returns {Object} { isValid: boolean, message?: string, invalidStationId?: string }
 */
export function validateTrainData(trainData, allStations) {
    // HH:MM形式 (00:00 - 23:59) をチェックする正規表現
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    for (const stop of trainData.stops) {
        // 出発時刻のチェック
        if (stop.departure && !timeRegex.test(stop.departure)) {
            const station = allStations.find(s => s.id === stop.station_id);
            return {
                isValid: false,
                message: `${station.name_jp}駅の出発時刻の形式が不正です。「HH:MM」(例: 09:30) の形式で入力してください。`,
                invalidStationId: stop.station_id
            };
        }
        // 到着時刻のチェック
        if (stop.arrival && !timeRegex.test(stop.arrival)) {
            const station = allStations.find(s => s.id === stop.station_id);
            return {
                isValid: false,
                message: `${station.name_jp}駅の到着時刻の形式が不正です。「HH:MM」(例: 18:05) の形式で入力してください。`,
                invalidStationId: stop.station_id
            };
        }
    }

    // すべてのチェックを通過した場合
    return { isValid: true };
}